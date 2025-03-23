import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge, badgeVariants } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertCircle, UserPlus, User, UserCheck, Shield, ShieldAlert } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

// Define admin user type
interface AdminUser {
  id: number;
  username: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// Form schema for creating a new admin
const adminFormSchema = z.object({
  username: z.string().min(3, { message: 'Username must be at least 3 characters' }),
  isActive: z.boolean().default(true),
});

type AdminFormValues = z.infer<typeof adminFormSchema>;

export default function AdminManagement() {
  const [openDialog, setOpenDialog] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch admin users
  const { data: admins, isLoading } = useQuery<AdminUser[]>({
    queryKey: ['/api/admins'],
  });

  // Form setup for new admin
  const form = useForm<AdminFormValues>({
    resolver: zodResolver(adminFormSchema),
    defaultValues: {
      username: '',
      isActive: true,
    },
  });

  // Create admin mutation
  const createAdminMutation = useMutation({
    mutationFn: async (values: AdminFormValues) => {
      return apiRequest('/api/admins', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(values),
      });
    },
    onSuccess: () => {
      toast({
        title: 'Admin created',
        description: 'The admin user has been created successfully.',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admins'] });
      form.reset();
      setOpenDialog(false);
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create admin user',
        variant: 'destructive',
      });
    },
  });

  // Update admin status mutation
  const updateAdminMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: number; isActive: boolean }) => {
      return apiRequest(`/api/admins/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ isActive }),
      });
    },
    onSuccess: () => {
      toast({
        title: 'Admin updated',
        description: 'The admin status has been updated successfully.',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admins'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update admin user',
        variant: 'destructive',
      });
    },
  });

  const onSubmit = (values: AdminFormValues) => {
    createAdminMutation.mutate(values);
  };

  const handleToggleActive = (admin: AdminUser) => {
    updateAdminMutation.mutate({
      id: admin.id,
      isActive: !admin.isActive,
    });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold">Admin Management</h1>
        <Dialog open={openDialog} onOpenChange={setOpenDialog}>
          <DialogTrigger asChild>
            <Button>
              <UserPlus className="mr-2 h-4 w-4" />
              Add Admin
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Admin</DialogTitle>
              <DialogDescription>
                Admin users can upload images and manage Telegram bot settings.
              </DialogDescription>
            </DialogHeader>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Username</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter Telegram username" {...field} />
                      </FormControl>
                      <FormDescription>
                        This should be the Telegram username without the @ symbol.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="isActive"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                      <div className="space-y-0.5">
                        <FormLabel>Active Status</FormLabel>
                        <FormDescription>
                          Enable or disable this admin account.
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <DialogFooter>
                  <Button
                    type="submit"
                    disabled={createAdminMutation.isPending}
                  >
                    {createAdminMutation.isPending ? 'Adding...' : 'Add Admin'}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Admin Users</CardTitle>
          <CardDescription>
            Manage Telegram users who have admin privileges.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-6">
              <p>Loading admin users...</p>
            </div>
          ) : admins && admins.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Username</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Last Updated</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {admins.map((admin) => (
                  <TableRow key={admin.id}>
                    <TableCell className="font-medium flex items-center">
                      <User className="mr-2 h-4 w-4" />
                      {admin.username}
                    </TableCell>
                    <TableCell>
                      {admin.isActive ? (
                        <div className={`${badgeVariants({ variant: "outline" })} bg-green-100 text-green-800`}>
                          Active
                        </div>
                      ) : (
                        <div className={`${badgeVariants({ variant: "destructive" })} bg-red-100 text-red-800`}>
                          Inactive
                        </div>
                      )}
                    </TableCell>
                    <TableCell>{formatDate(admin.createdAt)}</TableCell>
                    <TableCell>{formatDate(admin.updatedAt)}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleToggleActive(admin)}
                        disabled={updateAdminMutation.isPending}
                      >
                        {admin.isActive ? 'Deactivate' : 'Activate'}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="flex flex-col items-center justify-center py-6 text-center">
              <ShieldAlert className="h-12 w-12 text-muted-foreground mb-2" />
              <h3 className="text-lg font-medium">No admin users found</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Click the "Add Admin" button to create your first admin user.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}