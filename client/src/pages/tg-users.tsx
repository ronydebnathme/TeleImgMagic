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
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Loader2, AlertCircle, MoreHorizontal } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// Define the form schema
const formSchema = z.object({
  username: z.string().min(1, "Username is required"),
  isActive: z.boolean().default(true),
  notes: z.string().optional(),
  maxDailyImages: z.coerce.number().min(0, "Must be at least 0").default(10),
  allowedGroups: z.string().optional()
});

type FormData = z.infer<typeof formSchema>;

interface TelegramBotUser {
  id: number;
  username: string;
  isActive: boolean;
  notes: string | null;
  maxDailyImages: number;
  imagesUsedToday: number;
  allowedGroups: string[] | null;
  lastActivity: string | null;
  createdAt: string;
  updatedAt: string;
}

export default function TgUsersPage() {
  const { toast } = useToast();
  const [isAddingUser, setIsAddingUser] = useState(false);
  const [editingUser, setEditingUser] = useState<TelegramBotUser | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<TelegramBotUser | null>(null);

  // Fetch TG bot users
  const { data: tgBotUsers = [], isLoading } = useQuery({
    queryKey: ['/api/tg-bot-users'],
    queryFn: async () => {
      const res = await apiRequest<{ success: boolean; users: TelegramBotUser[] }>('GET', '/api/tg-bot-users');
      return res.users || [];
    },
  });

  // Create form for adding new TG bot users
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      username: '',
      isActive: true,
      notes: '',
      maxDailyImages: 10,
      allowedGroups: ''
    },
  });

  // Create form for editing TG bot users
  const editForm = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      username: '',
      isActive: true,
      notes: '',
      maxDailyImages: 10,
      allowedGroups: ''
    },
  });

  // Reset the form when the editing user changes
  useState(() => {
    if (editingUser) {
      editForm.reset({
        username: editingUser.username,
        isActive: editingUser.isActive,
        notes: editingUser.notes || '',
        maxDailyImages: editingUser.maxDailyImages,
        allowedGroups: editingUser.allowedGroups ? editingUser.allowedGroups.join(', ') : ''
      });
    }
  });

  // Mutation for adding a new TG bot user
  const addUserMutation = useMutation({
    mutationFn: async (data: FormData) => {
      // Make sure username starts with @
      if (!data.username.startsWith('@')) {
        data.username = '@' + data.username;
      }
      
      // Process allowed groups
      const processedData = {
        ...data,
        allowedGroups: data.allowedGroups 
          ? data.allowedGroups.split(',').map(g => g.trim()).filter(Boolean)
          : null
      };
      
      return apiRequest<{ success: boolean; user: TelegramBotUser }>('POST', '/api/tg-bot-users', processedData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tg-bot-users'] });
      form.reset();
      setIsAddingUser(false);
      toast({
        title: "Success",
        description: "TG bot user added successfully",
        variant: "default",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add TG bot user",
        variant: "destructive",
      });
    },
  });

  // Mutation for updating a TG bot user
  const updateUserMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: FormData }) => {
      // Make sure username starts with @
      if (!data.username.startsWith('@')) {
        data.username = '@' + data.username;
      }
      
      // Process allowed groups
      const processedData = {
        ...data,
        allowedGroups: data.allowedGroups 
          ? data.allowedGroups.split(',').map(g => g.trim()).filter(Boolean)
          : null
      };
      
      return apiRequest<{ success: boolean; user: TelegramBotUser }>('PUT', `/api/tg-bot-users/${id}`, processedData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tg-bot-users'] });
      setEditingUser(null);
      toast({
        title: "Success",
        description: "TG bot user updated successfully",
        variant: "default",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update TG bot user",
        variant: "destructive",
      });
    },
  });

  // Mutation for toggling user active status
  const toggleUserStatusMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: number; isActive: boolean }) => {
      return apiRequest<{ success: boolean; user: TelegramBotUser }>('PUT', `/api/tg-bot-users/${id}`, { isActive });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tg-bot-users'] });
      toast({
        title: "Success",
        description: "TG bot user status updated",
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

  // Mutation for deleting a TG bot user
  const deleteUserMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest<{ success: boolean }>('DELETE', `/api/tg-bot-users/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tg-bot-users'] });
      setDeleteDialogOpen(false);
      setUserToDelete(null);
      toast({
        title: "Success",
        description: "TG bot user removed successfully",
        variant: "default",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to remove TG bot user",
        variant: "destructive",
      });
    },
  });

  // Function to handle form submission for adding a new user
  const onSubmit = (data: FormData) => {
    addUserMutation.mutate(data);
  };

  // Function to handle form submission for editing a user
  const onEditSubmit = (data: FormData) => {
    if (editingUser) {
      updateUserMutation.mutate({ id: editingUser.id, data });
    }
  };

  // Function to handle clicking the edit button for a user
  const handleEdit = (user: TelegramBotUser) => {
    setEditingUser(user);
    editForm.reset({
      username: user.username,
      isActive: user.isActive,
      notes: user.notes || '',
      maxDailyImages: user.maxDailyImages,
      allowedGroups: user.allowedGroups ? user.allowedGroups.join(', ') : ''
    });
  };

  // Function to handle toggling a user's active status
  const handleToggleActive = (user: TelegramBotUser) => {
    toggleUserStatusMutation.mutate({ id: user.id, isActive: !user.isActive });
  };

  // Function to open the delete dialog for a user
  const openDeleteDialog = (user: TelegramBotUser) => {
    setUserToDelete(user);
    setDeleteDialogOpen(true);
  };

  // Function to handle deleting a user
  const handleDelete = () => {
    if (userToDelete) {
      deleteUserMutation.mutate(userToDelete.id);
    }
  };

  // Calculate table states
  const isTableEmpty = tgBotUsers.length === 0 && !isLoading;
  const showTable = tgBotUsers.length > 0 && !isLoading;

  // Format the date for display
  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleString();
  };

  return (
    <div className="container mx-auto py-10 px-4 sm:px-6 md:px-8 max-w-7xl">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">TG Bot Users</h1>
          <p className="text-muted-foreground mt-1">
            Manage Telegram bot users who can request images.
          </p>
        </div>
        <Button onClick={() => setIsAddingUser(true)} className="shrink-0">
          Add TG Bot User
        </Button>
      </div>

      {/* Main content card */}
      <Card>
        <CardHeader>
          <CardTitle>TG Bot Users</CardTitle>
          <CardDescription>
            View and manage Telegram users who can request images from the bot.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading && (
            <div className="flex items-center justify-center h-40">
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">Loading TG bot users...</p>
              </div>
            </div>
          )}

          {isTableEmpty && (
            <div className="flex flex-col items-center justify-center h-40 text-center">
              <AlertCircle className="h-8 w-8 text-muted-foreground" />
              <h3 className="mt-2 text-lg font-semibold">No TG bot users found</h3>
              <p className="mt-1 text-sm text-muted-foreground max-w-sm">
                There are no Telegram bot users yet. Click "Add TG Bot User" to add one.
              </p>
            </div>
          )}

          {showTable && (
            <div className="overflow-auto">
              <Table>
                <TableCaption>List of Telegram bot users</TableCaption>
                <TableHeader>
                  <TableRow>
                    <TableHead>Username</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Daily Images</TableHead>
                    <TableHead>Last Activity</TableHead>
                    <TableHead>Allowed Groups</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tgBotUsers.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">{user.username}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className={`h-2 w-2 rounded-full ${user.isActive ? 'bg-green-500' : 'bg-red-500'}`} />
                          <span>{user.isActive ? 'Active' : 'Inactive'}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="text-sm">{user.imagesUsedToday} / {user.maxDailyImages}</span>
                          <div className="w-24 h-2 bg-slate-200 rounded mt-1">
                            <div 
                              className="h-2 bg-primary rounded" 
                              style={{ 
                                width: `${Math.min(100, (user.imagesUsedToday / Math.max(1, user.maxDailyImages)) * 100)}%` 
                              }}
                            />
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{formatDate(user.lastActivity)}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {user.allowedGroups && user.allowedGroups.length > 0 ? (
                            user.allowedGroups.map((group, index) => (
                              <Badge key={index} variant="outline">{group}</Badge>
                            ))
                          ) : (
                            <span className="text-muted-foreground text-sm">All groups</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="h-4 w-4" />
                              <span className="sr-only">Open menu</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleEdit(user)}>
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleToggleActive(user)}>
                              {user.isActive ? 'Deactivate' : 'Activate'}
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              className="text-red-600"
                              onClick={() => openDeleteDialog(user)}
                            >
                              Remove
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add User Dialog */}
      <Dialog open={isAddingUser} onOpenChange={setIsAddingUser}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Add TG Bot User</DialogTitle>
            <DialogDescription>
              Add a Telegram user who can request images from the bot.
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
                          Is this user active?
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
                  name="maxDailyImages"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Max Daily Images</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          min="0" 
                          placeholder="10" 
                          {...field} 
                        />
                      </FormControl>
                      <FormDescription>
                        Maximum image requests per day
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <FormField
                control={form.control}
                name="allowedGroups"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Allowed Groups</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Group1, Group2, etc."
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Optional. Comma-separated list of group names this user is limited to. Leave empty for no restrictions.
                    </FormDescription>
                    <FormMessage />
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
                        placeholder="Optional notes about this user"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddingUser(false)} type="button">
                  Cancel
                </Button>
                <Button type="submit" disabled={addUserMutation.isPending}>
                  {addUserMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Add TG Bot User
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog open={editingUser !== null} onOpenChange={(open) => !open && setEditingUser(null)}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit TG Bot User</DialogTitle>
            <DialogDescription>
              Update Telegram bot user details.
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
                          Is this user active?
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
                  name="maxDailyImages"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Max Daily Images</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          min="0" 
                          placeholder="10" 
                          {...field} 
                        />
                      </FormControl>
                      <FormDescription>
                        Maximum image requests per day
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <FormField
                control={editForm.control}
                name="allowedGroups"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Allowed Groups</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Group1, Group2, etc."
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Optional. Comma-separated list of group names this user is limited to. Leave empty for no restrictions.
                    </FormDescription>
                    <FormMessage />
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
                        placeholder="Optional notes about this user"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <DialogFooter>
                <Button variant="outline" onClick={() => setEditingUser(null)} type="button">
                  Cancel
                </Button>
                <Button type="submit" disabled={updateUserMutation.isPending}>
                  {updateUserMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Update TG Bot User
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete User Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Remove TG Bot User</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove this Telegram bot user?
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <p className="text-sm text-muted-foreground">
              This will permanently remove <strong>{userToDelete?.username}</strong> from the list of Telegram bot users.
              They will no longer be able to request images from the bot.
            </p>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleDelete}
              disabled={deleteUserMutation.isPending}
            >
              {deleteUserMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Remove
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}