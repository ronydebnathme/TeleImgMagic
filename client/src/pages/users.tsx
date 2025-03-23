import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";

// UI components
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import {
  Table,
  TableBody,
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
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue, 
} from "@/components/ui/select";
import { AlertCircle, CheckCircle, Trash, Pencil, Plus } from "lucide-react";

// Define the schema for the user form
const userFormSchema = z.object({
  username: z
    .string()
    .trim()
    .min(1, "Username is required"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string().min(8, "Confirm password is required"),
  email: z.string().email("Invalid email address").optional().or(z.literal("")),
  fullName: z.string().optional().or(z.literal("")),
  role: z.enum(["user", "admin"]).default("user"),
  isActive: z.boolean().default(true),
  notes: z.string().optional().default(""),
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"]
});

// Define a separate edit schema that doesn't require password
const editUserFormSchema = z.object({
  username: z.string().trim().min(1, "Username is required"),
  isActive: z.boolean().default(true),
  notes: z.string().optional().default(""),
});

type UserFormValues = z.infer<typeof userFormSchema>;

interface AuthorizedUser {
  id: number;
  username: string;
  email: string | null;
  fullName: string | null;
  role: string;
  isActive: boolean;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export default function UsersPage() {
  const isMobile = useIsMobile();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<AuthorizedUser | null>(null);

  interface UsersResponse {
    success: boolean;
    users: AuthorizedUser[];
  }

  // Query to fetch authorized users
  const { 
    data: usersData, 
    isLoading,
    isError 
  } = useQuery<UsersResponse>({
    queryKey: ["/api/authorized-users"],
    refetchOnWindowFocus: false,
  });

  // Form for adding new users
  const form = useForm<UserFormValues>({
    resolver: zodResolver(userFormSchema),
    defaultValues: {
      username: "",
      password: "",
      confirmPassword: "",
      email: "",
      fullName: "",
      role: "user",
      isActive: true,
      notes: "",
    },
  });

  type EditUserFormValues = z.infer<typeof editUserFormSchema>;

  // Edit form
  const editForm = useForm<EditUserFormValues>({
    resolver: zodResolver(editUserFormSchema),
    defaultValues: {
      username: "",
      isActive: true,
      notes: "",
    },
  });

  // Mutation for adding a new authorized user
  const addUserMutation = useMutation({
    mutationFn: async (values: UserFormValues) => {
      console.log("Sending values to API:", values);
      // Send the data to the server
      try {
        const response = await apiRequest("/api/authorized-users", {
          method: "POST",
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(values),
        });
        console.log("API response:", response);
        return response;
      } catch (error) {
        console.error("Error in mutation:", error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/authorized-users"] });
      setIsAddUserOpen(false);
      form.reset();
      toast({
        title: "User authorized successfully",
        description: "The user can now interact with the bot in DMs.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to authorize user",
        description: error.message || "An error occurred",
        variant: "destructive",
      });
    },
  });

  // Mutation for updating an authorized user
  const updateUserMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: EditUserFormValues }) => {
      console.log("Updating user with data:", data);
      try {
        const response = await apiRequest(`/api/authorized-users/${id}`, {
          method: "PUT",
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(data),
        });
        console.log("Update API response:", response);
        return response;
      } catch (error) {
        console.error("Error in update mutation:", error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/authorized-users"] });
      setEditingUser(null);
      toast({
        title: "User updated successfully",
        description: "The user's authorization details have been updated.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to update user",
        description: error.message || "An error occurred",
        variant: "destructive",
      });
    },
  });

  // Mutation for deactivating a user
  const deactivateUserMutation = useMutation({
    mutationFn: async (id: number) => {
      console.log("Deactivating user with ID:", id);
      try {
        const response = await apiRequest(`/api/authorized-users/${id}`, {
          method: "DELETE",
          headers: {
            'Content-Type': 'application/json'
          }
        });
        console.log("Deactivate API response:", response);
        return response;
      } catch (error) {
        console.error("Error in deactivate mutation:", error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/authorized-users"] });
      toast({
        title: "User deactivated",
        description: "The user can no longer interact with the bot in DMs.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to deactivate user",
        description: error.message || "An error occurred",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (values: UserFormValues) => {
    console.log("Form values to submit:", values);
    // Let the zod schema and the API do the validation
    addUserMutation.mutate(values);
  };

  const onEditSubmit = (values: EditUserFormValues) => {
    if (editingUser) {
      updateUserMutation.mutate({ id: editingUser.id, data: values });
    }
  };

  const handleEdit = (user: AuthorizedUser) => {
    // Prepare username for display (make sure it has @ prefix)
    const displayUsername = user.username.startsWith('@') 
      ? user.username 
      : `@${user.username}`;
    
    editForm.reset({
      username: displayUsername,
      isActive: user.isActive,
      notes: user.notes || "",
    });
    setEditingUser(user);
  };

  const handleDeactivate = (id: number) => {
    if (confirm("Are you sure you want to deactivate this user? They won't be able to use the bot in DMs anymore.")) {
      deactivateUserMutation.mutate(id);
    }
  };

  // Guard for usersData to satisfy TypeScript
  const displayUsers = usersData?.users || [];
  const hasUsers = displayUsers.length > 0;

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Authorized Users</h1>
          <p className="text-gray-500 mt-1">
            Manage users who are allowed to interact with the bot in direct messages
          </p>
        </div>
        <Button 
          className="mt-4 md:mt-0" 
          onClick={() => setIsAddUserOpen(true)}
        >
          <Plus className="mr-2 h-4 w-4" /> Add User
        </Button>
      </div>

      <Separator className="my-6" />

      {isLoading ? (
        <div className="flex justify-center my-12">
          <div className="text-center">
            <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading users...</p>
          </div>
        </div>
      ) : isError ? (
        <Card className="bg-red-50 border-red-200">
          <CardContent className="pt-6">
            <div className="flex items-center">
              <AlertCircle className="h-5 w-5 text-red-600 mr-2" />
              <p className="text-red-600">Failed to load authorized users</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div>
          {hasUsers ? (
            <div className="bg-white rounded-lg shadow overflow-hidden">
              {isMobile ? (
                // Mobile view: cards
                <div className="grid grid-cols-1 gap-4">
                  {displayUsers.map((user: AuthorizedUser) => (
                    <Card key={user.id}>
                      <CardHeader className="pb-2">
                        <div className="flex justify-between items-center">
                          <div className="flex items-center">
                            <h3 className="text-lg font-medium">{user.username}</h3>
                            <Badge className={`ml-2 ${user.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                              {user.isActive ? 'Active' : 'Inactive'}
                            </Badge>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="pb-2">
                        {user.notes && (
                          <p className="text-gray-600 text-sm mb-2">{user.notes}</p>
                        )}
                        <p className="text-xs text-gray-500">
                          Added on {new Date(user.createdAt).toLocaleDateString()}
                        </p>
                      </CardContent>
                      <CardFooter className="flex justify-end space-x-2 pt-0">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => handleEdit(user)}
                        >
                          <Pencil className="h-4 w-4 mr-1" /> Edit
                        </Button>
                        {user.isActive && (
                          <Button 
                            variant="destructive" 
                            size="sm" 
                            onClick={() => handleDeactivate(user.id)}
                          >
                            <Trash className="h-4 w-4 mr-1" /> Deactivate
                          </Button>
                        )}
                      </CardFooter>
                    </Card>
                  ))}
                </div>
              ) : (
                // Desktop view: table
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-48">Username</TableHead>
                      <TableHead className="w-32">Status</TableHead>
                      <TableHead>Notes</TableHead>
                      <TableHead className="w-36">Added</TableHead>
                      <TableHead className="w-36 text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {displayUsers.map((user: AuthorizedUser) => (
                      <TableRow key={user.id}>
                        <TableCell className="font-medium">{user.username}</TableCell>
                        <TableCell>
                          <Badge className={user.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                            {user.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-gray-600 truncate max-w-[300px]">
                          {user.notes || '-'}
                        </TableCell>
                        <TableCell className="text-gray-500">
                          {new Date(user.createdAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end space-x-2">
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => handleEdit(user)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            {user.isActive && (
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                onClick={() => handleDeactivate(user.id)}
                              >
                                <Trash className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          ) : (
            <Card>
              <CardContent className="pt-6 pb-6 flex flex-col items-center">
                <p className="text-gray-500 mb-4">No authorized users yet</p>
                <Button onClick={() => setIsAddUserOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" /> Add Your First User
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Add User Dialog */}
      <Dialog open={isAddUserOpen} onOpenChange={setIsAddUserOpen}>
        <DialogContent className="max-h-screen overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Authorized User</DialogTitle>
            <DialogDescription>
              Add a Telegram username to allow them to use the bot in direct messages.
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
                      <Input placeholder="Username" {...field} />
                    </FormControl>
                    <FormDescription>
                      Enter the username for login
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="••••••••" {...field} />
                    </FormControl>
                    <FormDescription>
                      Password must be at least 8 characters
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirm Password</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="••••••••" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email (Optional)</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="user@example.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="fullName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name (Optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="Full Name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>User Role</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a role" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="user">Regular User</SelectItem>
                        <SelectItem value="admin">Administrator</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Admins have full access to manage users and system settings
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
                        Enable or disable access to the system
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
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes (Optional)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Add any notes about this user"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <DialogFooter>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsAddUserOpen(false)}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={addUserMutation.isPending}
                >
                  {addUserMutation.isPending ? "Adding..." : "Add User"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog open={!!editingUser} onOpenChange={(open) => !open && setEditingUser(null)}>
        <DialogContent className="max-h-screen overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Authorized User</DialogTitle>
            <DialogDescription>
              Update the authorization details for this user.
            </DialogDescription>
          </DialogHeader>
          
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4">
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
                      Update the Telegram username with @ prefix
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={editForm.control}
                name="isActive"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                    <div className="space-y-0.5">
                      <FormLabel>Active Status</FormLabel>
                      <FormDescription>
                        Enable or disable access to the bot
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
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes (Optional)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Add any notes about this user"
                        {...field}
                        value={field.value || ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <DialogFooter>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setEditingUser(null)}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={updateUserMutation.isPending}
                >
                  {updateUserMutation.isPending ? "Saving..." : "Save Changes"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}