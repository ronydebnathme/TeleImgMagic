import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { X, CheckCircle, AlertCircle, Loader2 } from "lucide-react";

// Define the form schema
const formSchema = z.object({
  username: z.string().min(1, "Username is required"),
  isActive: z.boolean().default(true),
  notes: z.string().optional(),
  canSendFiles: z.boolean().default(true),
  canManageUsers: z.boolean().default(false),
});

type FormData = z.infer<typeof formSchema>;

interface TelegramBotAdmin {
  id: number;
  username: string;
  isActive: boolean;
  notes: string | null;
  canSendFiles: boolean;
  canManageUsers: boolean;
  createdAt: string;
  updatedAt: string;
}

export default function TgAdminsPage() {
  const { toast } = useToast();
  const [isAddingAdmin, setIsAddingAdmin] = useState(false);
  const [editingAdmin, setEditingAdmin] = useState<TelegramBotAdmin | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [adminToDelete, setAdminToDelete] = useState<TelegramBotAdmin | null>(null);

  // Fetch TG bot admins 
  const { data: tgBotAdmins = [], isLoading } = useQuery({
    queryKey: ['/api/tg-bot-admins'],
    queryFn: async () => {
      const res = await apiRequest<{ success: boolean; admins: TelegramBotAdmin[] }>('GET', '/api/tg-bot-admins');
      return res.admins;
    },
  });

  // Create form for adding new TG bot admins
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      username: '',
      isActive: true,
      notes: '',
      canSendFiles: true,
      canManageUsers: false,
    },
  });

  // Create form for editing TG bot admins
  const editForm = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      username: '',
      isActive: true,
      notes: '',
      canSendFiles: true,
      canManageUsers: false,
    },
  });

  // Reset the form when the editing admin changes
  useState(() => {
    if (editingAdmin) {
      editForm.reset({
        username: editingAdmin.username,
        isActive: editingAdmin.isActive,
        notes: editingAdmin.notes || '',
        canSendFiles: editingAdmin.canSendFiles,
        canManageUsers: editingAdmin.canManageUsers,
      });
    }
  });

  // Mutation for adding a new TG bot admin
  const addAdminMutation = useMutation({
    mutationFn: async (data: FormData) => {
      // Make sure username starts with @
      if (!data.username.startsWith('@')) {
        data.username = '@' + data.username;
      }
      
      return apiRequest<{ success: boolean; admin: TelegramBotAdmin }>('POST', '/api/tg-bot-admins', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tg-bot-admins'] });
      form.reset();
      setIsAddingAdmin(false);
      toast({
        title: "Success",
        description: "TG bot admin added successfully",
        variant: "default",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add TG bot admin",
        variant: "destructive",
      });
    },
  });

  // Mutation for updating a TG bot admin
  const updateAdminMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: FormData }) => {
      // Make sure username starts with @
      if (!data.username.startsWith('@')) {
        data.username = '@' + data.username;
      }
      
      return apiRequest<{ success: boolean; admin: TelegramBotAdmin }>('PUT', `/api/tg-bot-admins/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tg-bot-admins'] });
      setEditingAdmin(null);
      toast({
        title: "Success",
        description: "TG bot admin updated successfully",
        variant: "default",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update TG bot admin",
        variant: "destructive",
      });
    },
  });

  // Mutation for toggling admin active status
  const toggleAdminStatusMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: number; isActive: boolean }) => {
      return apiRequest<{ success: boolean; admin: TelegramBotAdmin }>('PUT', `/api/tg-bot-admins/${id}`, { isActive });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tg-bot-admins'] });
      toast({
        title: "Success",
        description: "TG bot admin status updated",
        variant: "default",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update status",
        variant: "destructive",
      });
    },
  });

  // Mutation for deleting a TG bot admin
  const deleteAdminMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest<{ success: boolean }>('DELETE', `/api/tg-bot-admins/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tg-bot-admins'] });
      setDeleteDialogOpen(false);
      setAdminToDelete(null);
      toast({
        title: "Success",
        description: "TG bot admin removed successfully",
        variant: "default",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to remove TG bot admin",
        variant: "destructive",
      });
    },
  });

  // Function to handle form submission for adding a new admin
  const onSubmit = (data: FormData) => {
    addAdminMutation.mutate(data);
  };

  // Function to handle form submission for editing an admin
  const onEditSubmit = (data: FormData) => {
    if (editingAdmin) {
      updateAdminMutation.mutate({ id: editingAdmin.id, data });
    }
  };

  // Function to handle clicking the edit button for an admin
  const handleEdit = (admin: TelegramBotAdmin) => {
    setEditingAdmin(admin);
    editForm.reset({
      username: admin.username,
      isActive: admin.isActive,
      notes: admin.notes || '',
      canSendFiles: admin.canSendFiles,
      canManageUsers: admin.canManageUsers,
    });
  };

  // Function to handle toggling an admin's active status
  const handleToggleActive = (admin: TelegramBotAdmin) => {
    toggleAdminStatusMutation.mutate({ id: admin.id, isActive: !admin.isActive });
  };

  // Function to open the delete dialog for an admin
  const openDeleteDialog = (admin: TelegramBotAdmin) => {
    setAdminToDelete(admin);
    setDeleteDialogOpen(true);
  };

  // Function to handle deleting an admin
  const handleDelete = () => {
    if (adminToDelete) {
      deleteAdminMutation.mutate(adminToDelete.id);
    }
  };

  // Calculate table states
  const isTableEmpty = tgBotAdmins.length === 0 && !isLoading;
  const showTable = tgBotAdmins.length > 0 && !isLoading;

  return (
    <div className="container mx-auto py-10 px-4 sm:px-6 md:px-8 max-w-7xl">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">TG Bot Admins</h1>
          <p className="text-muted-foreground mt-1">
            Manage Telegram bot admins who can send files and manage the bot.
          </p>
        </div>
        <Button onClick={() => setIsAddingAdmin(true)} className="shrink-0">
          Add TG Bot Admin
        </Button>
      </div>

      {/* Main content card */}
      <Card>
        <CardHeader>
          <CardTitle>TG Bot Admins</CardTitle>
          <CardDescription>
            View and manage Telegram bot administrators. Bot admins can send files via the bot and optionally manage users.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading && (
            <div className="flex items-center justify-center h-40">
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">Loading TG bot admins...</p>
              </div>
            </div>
          )}

          {isTableEmpty && (
            <div className="flex flex-col items-center justify-center h-40 text-center">
              <AlertCircle className="h-8 w-8 text-muted-foreground" />
              <h3 className="mt-2 text-lg font-semibold">No TG bot admins found</h3>
              <p className="mt-1 text-sm text-muted-foreground max-w-sm">
                There are no Telegram bot administrators yet. Click "Add TG Bot Admin" to add one.
              </p>
            </div>
          )}

          {showTable && (
            <div className="overflow-auto">
              <Table>
                <TableCaption>List of Telegram bot administrators</TableCaption>
                <TableHeader>
                  <TableRow>
                    <TableHead>Username</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Can Send Files</TableHead>
                    <TableHead>Can Manage Users</TableHead>
                    <TableHead>Added On</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tgBotAdmins.map((admin) => (
                    <TableRow key={admin.id}>
                      <TableCell className="font-medium">{admin.username}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className={`h-2 w-2 rounded-full ${admin.isActive ? 'bg-green-500' : 'bg-red-500'}`} />
                          <span>{admin.isActive ? 'Active' : 'Inactive'}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {admin.canSendFiles ? (
                          <CheckCircle className="h-5 w-5 text-green-500" />
                        ) : (
                          <X className="h-5 w-5 text-red-500" />
                        )}
                      </TableCell>
                      <TableCell>
                        {admin.canManageUsers ? (
                          <CheckCircle className="h-5 w-5 text-green-500" />
                        ) : (
                          <X className="h-5 w-5 text-red-500" />
                        )}
                      </TableCell>
                      <TableCell>{new Date(admin.createdAt).toLocaleDateString()}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleToggleActive(admin)}
                          >
                            {admin.isActive ? 'Deactivate' : 'Activate'}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(admin)}
                          >
                            Edit
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-500 hover:text-red-700 hover:bg-red-50"
                            onClick={() => openDeleteDialog(admin)}
                          >
                            Remove
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Admin Dialog */}
      <Dialog open={isAddingAdmin} onOpenChange={setIsAddingAdmin}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Add TG Bot Admin</DialogTitle>
            <DialogDescription>
              Add a Telegram bot administrator who can send files and manage the bot.
            </DialogDescription>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Telegram Username</FormLabel>
                    <FormControl>
                      <Input placeholder="@username" {...field} />
                    </FormControl>
                    <FormDescription>
                      Enter the Telegram username including the @ symbol.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="isActive"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between p-3 border rounded-md">
                      <div>
                        <FormLabel>Active</FormLabel>
                        <FormDescription>
                          Is this admin active?
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
                
                <FormField
                  control={form.control}
                  name="canSendFiles"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between p-3 border rounded-md">
                      <div>
                        <FormLabel>Send Files</FormLabel>
                        <FormDescription>
                          Can send files via bot
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
              </div>
              
              <FormField
                control={form.control}
                name="canManageUsers"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 p-3 border rounded-md">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>
                        Can Manage Users
                      </FormLabel>
                      <FormDescription>
                        Allow this admin to manage Telegram bot users
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Optional notes about this admin"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddingAdmin(false)} type="button">
                  Cancel
                </Button>
                <Button type="submit" disabled={addAdminMutation.isPending}>
                  {addAdminMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Add TG Bot Admin
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Edit Admin Dialog */}
      <Dialog open={editingAdmin !== null} onOpenChange={(open) => !open && setEditingAdmin(null)}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit TG Bot Admin</DialogTitle>
            <DialogDescription>
              Update Telegram bot administrator details.
            </DialogDescription>
          </DialogHeader>
          
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-6">
              <FormField
                control={editForm.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Telegram Username</FormLabel>
                    <FormControl>
                      <Input placeholder="@username" {...field} />
                    </FormControl>
                    <FormDescription>
                      Enter the Telegram username including the @ symbol.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={editForm.control}
                  name="isActive"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between p-3 border rounded-md">
                      <div>
                        <FormLabel>Active</FormLabel>
                        <FormDescription>
                          Is this admin active?
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
                
                <FormField
                  control={editForm.control}
                  name="canSendFiles"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between p-3 border rounded-md">
                      <div>
                        <FormLabel>Send Files</FormLabel>
                        <FormDescription>
                          Can send files via bot
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
              </div>
              
              <FormField
                control={editForm.control}
                name="canManageUsers"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 p-3 border rounded-md">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>
                        Can Manage Users
                      </FormLabel>
                      <FormDescription>
                        Allow this admin to manage Telegram bot users
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />
              
              <FormField
                control={editForm.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Optional notes about this admin"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <DialogFooter>
                <Button variant="outline" onClick={() => setEditingAdmin(null)} type="button">
                  Cancel
                </Button>
                <Button type="submit" disabled={updateAdminMutation.isPending}>
                  {updateAdminMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Update TG Bot Admin
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete Admin Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Remove TG Bot Admin</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove this Telegram bot administrator?
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <p className="text-sm text-muted-foreground">
              This will permanently remove <strong>{adminToDelete?.username}</strong> from the list of Telegram bot administrators.
              They will no longer be able to send files or manage the bot.
            </p>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleDelete}
              disabled={deleteAdminMutation.isPending}
            >
              {deleteAdminMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Remove
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}