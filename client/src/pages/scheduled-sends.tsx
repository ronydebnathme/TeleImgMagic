import React, { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { format } from "date-fns";
import { CalendarIcon, Check, CheckCircle, Loader2, PlayCircle, RefreshCw, Send, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";

// Define the validation schema for the form
const scheduledSendSchema = z.object({
  name: z.string().min(3, "Name must be at least 3 characters"),
  groupHandle: z.string()
    .min(1, "Group handle or name is required"),
  groupId: z.string().optional(), // Keep for compatibility
  selectedUserIds: z.array(z.string()).min(1, "At least one user must be selected"),
  imagesToSend: z.number().min(1).max(100),
  messageTemplate: z.string().min(5, "Template must be at least 5 characters"),
  scheduledDate: z.date().optional(),
  isRecurring: z.boolean().default(false),
  recurringType: z.string().default("daily"),
  timeOfDay: z.string().optional(),
});

type ScheduledSendFormValues = z.infer<typeof scheduledSendSchema>;

// Define interfaces for our data types
interface TelegramGroup {
  id: number;
  groupId: string;
  groupName: string;
  groupType: string;
  memberCount: number;
  isActive: boolean;
  lastUpdated: string;
  createdAt: string;
}

interface TelegramGroupMember {
  id: number;
  groupId: string;
  userId: string;
  username: string | null;
  firstName: string | null;
  lastName: string | null;
  isAdmin: boolean;
  isBot: boolean;
  lastSeen: string | null;
  createdAt: string;
}

interface ScheduledSend {
  id: number;
  name: string;
  groupId: string;
  selectedUserIds: string[];
  imagesToSend: number;
  messageTemplate: string;
  status: "pending" | "in_progress" | "completed" | "failed";
  scheduledDate: string | null;
  isRecurring: boolean;
  recurringType: string;
  timeOfDay: string | null;
  completedAt: string | null;
  createdBy: string | null;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
}

// Helper function to format date
function formatDate(dateString: string | null): string {
  if (!dateString) return "Not scheduled";
  return format(new Date(dateString), "PPP");
}

export default function ScheduledSends() {
  const { toast } = useToast();
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [selectedScheduledSend, setSelectedScheduledSend] = useState<ScheduledSend | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  // Fetch the list of scheduled sends
  const scheduledSendsQuery = useQuery({
    queryKey: ["/api/scheduled-sends"],
    queryFn: () => apiRequest<ScheduledSend[]>("/api/scheduled-sends"),
  });

  // Fetch the list of Telegram groups
  const groupsQuery = useQuery({
    queryKey: ["/api/telegram/groups"],
    queryFn: () => apiRequest<TelegramGroup[]>("/api/telegram/groups"),
  });

  // Fetch members of the selected group
  const membersQuery = useQuery({
    queryKey: ["/api/telegram/groups", selectedGroup, "members"],
    queryFn: () => 
      selectedGroup 
        ? apiRequest<TelegramGroupMember[]>(`/api/telegram/groups/${selectedGroup}/members`) 
        : Promise.resolve([]),
    enabled: !!selectedGroup,
  });

  // Create a new scheduled send
  const createScheduledSendMutation = useMutation({
    mutationFn: (values: ScheduledSendFormValues) => {
      return apiRequest<ScheduledSend>("/api/scheduled-sends", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(values),
      });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Scheduled send created successfully",
      });
      setIsCreateDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ["/api/scheduled-sends"] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to create scheduled send: ${error}`,
        variant: "destructive",
      });
    },
  });

  // Execute a scheduled send immediately
  const executeScheduledSendMutation = useMutation({
    mutationFn: (id: number) => {
      return apiRequest(`/api/scheduled-sends/${id}/execute`, {
        method: "POST",
      });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Scheduled send executed successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/scheduled-sends"] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to execute scheduled send: ${error}`,
        variant: "destructive",
      });
    },
  });

  // Sync groups with Telegram
  const syncGroupsMutation = useMutation({
    mutationFn: () => {
      return apiRequest("/api/telegram/groups/sync", {
        method: "POST",
      });
    },
    onSuccess: (response) => {
      // Check if there's a warning in the response
      if (response.warning) {
        toast({
          title: "Success with warning",
          description: response.warning,
          variant: "default",
          className: "bg-yellow-50 border-yellow-200 text-yellow-800",
        });
      } else {
        toast({
          title: "Success",
          description: "Groups synchronized successfully",
        });
      }
      queryClient.invalidateQueries({ queryKey: ["/api/telegram/groups"] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to sync groups: ${error}`,
        variant: "destructive",
      });
    },
  });

  // Function to display the group handle or name
  const getGroupDisplayName = (groupId: string): string => {
    // Find the group in our data if possible
    const group = groupsQuery.data?.find(g => g.groupId === groupId);
    if (group) {
      return group.groupName;
    }
    
    // Otherwise, just show the group ID in a nicer format
    if (groupId.startsWith('group_')) {
      return `@${groupId.substring(6, 12)}...`;
    }
    
    return groupId.length > 10 ? `@${groupId.substring(0, 8)}...` : `@${groupId}`;
  };

  // Setup form with react-hook-form
  const form = useForm<ScheduledSendFormValues>({
    resolver: zodResolver(scheduledSendSchema),
    defaultValues: {
      name: "",
      groupHandle: "",
      groupId: "",
      selectedUserIds: [],
      imagesToSend: 15,
      messageTemplate: "@{username}, pics for {date}",
      scheduledDate: undefined,
      isRecurring: false,
      recurringType: "daily",
      timeOfDay: "09:00",
    },
  });

  // Create a mutation to verify group membership
  const verifyGroupMutation = useMutation({
    mutationFn: (groupHandle: string) => {
      return apiRequest("/api/telegram/verify-group", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ groupHandle }),
      });
    },
    onSuccess: (response) => {
      if (response.verified) {
        setSelectedGroup(response.groupId);
        toast({
          title: "Group Verified",
          description: "Bot is a member of this group. You can select members to send images to.",
        });
      } else {
        setSelectedGroup(null);
        form.setValue("selectedUserIds", []);
        toast({
          title: "Verification Failed",
          description: response.message || "Could not verify bot membership in this group.",
          variant: "destructive",
        });
      }
    },
    onError: (error) => {
      setSelectedGroup(null);
      form.setValue("selectedUserIds", []);
      toast({
        title: "Verification Error",
        description: `Failed to verify group: ${error}`,
        variant: "destructive",
      });
    },
  });

  // Watch the groupHandle field to verify membership
  const watchedGroupHandle = form.watch("groupHandle");
  React.useEffect(() => {
    // No auto-verification on typing anymore
    // The user needs to click the verify button manually
    // This is necessary because we support both handles (@group) and group names
    if (!watchedGroupHandle) {
      setSelectedGroup(null);
      form.setValue("selectedUserIds", []);
    }
  }, [watchedGroupHandle]);

  // Handle form submission
  function onSubmit(values: ScheduledSendFormValues) {
    if (selectedGroup) {
      // Set the groupId based on the validated group
      values.groupId = selectedGroup;
      createScheduledSendMutation.mutate(values);
    } else {
      toast({
        title: "Group not verified", 
        description: "Please enter a valid group handle and wait for verification.",
        variant: "destructive"
      });
    }
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Scheduled Sends</h1>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => syncGroupsMutation.mutate()}
            disabled={syncGroupsMutation.isPending}
          >
            {syncGroupsMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Syncing...
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                Sync Groups
              </>
            )}
          </Button>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Send className="mr-2 h-4 w-4" />
                Create Scheduled Send
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create Scheduled Send</DialogTitle>
                <DialogDescription>
                  Schedule image sends to specific group members.
                </DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Daily Send" {...field} />
                        </FormControl>
                        <FormDescription>
                          A name to identify this scheduled send.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="groupHandle"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Telegram Group Handle or Name</FormLabel>
                        <div className="flex space-x-2">
                          <FormControl>
                            <Input 
                              placeholder="@groupname or Group Name" 
                              {...field} 
                            />
                          </FormControl>
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                              if (field.value) {
                                verifyGroupMutation.mutate(field.value);
                              } else {
                                toast({
                                  title: "Group handle required",
                                  description: "Please enter a group handle or name first",
                                  variant: "destructive"
                                });
                              }
                            }}
                            disabled={verifyGroupMutation.isPending}
                          >
                            {verifyGroupMutation.isPending ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Checking...
                              </>
                            ) : (
                              <>
                                <CheckCircle className="mr-2 h-4 w-4" /> 
                                Check Group
                              </>
                            )}
                          </Button>
                        </div>
                        {selectedGroup && (
                          <div className="mt-2 text-sm text-green-600 flex items-center">
                            <CheckCircle className="h-4 w-4 mr-1" /> Group verified successfully
                          </div>
                        )}
                        <FormDescription>
                          Enter the Telegram group handle (with @) or group name. Bot must be a member of this group.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="selectedUserIds"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Group Members</FormLabel>
                        <div className="border rounded-md p-4 max-h-60 overflow-y-auto space-y-2">
                          {membersQuery.isLoading ? (
                            <div className="flex items-center justify-center">
                              <Loader2 className="h-4 w-4 animate-spin mr-2" />
                              Loading members...
                            </div>
                          ) : membersQuery.data?.length ? (
                            membersQuery.data
                              .filter(member => !member.isBot)
                              .map((member) => (
                                <div 
                                  key={member.userId} 
                                  className="flex items-center space-x-2"
                                >
                                  <input
                                    type="checkbox"
                                    id={`user-${member.userId}`}
                                    value={member.userId}
                                    checked={field.value.includes(member.userId)}
                                    onChange={(e) => {
                                      if (e.target.checked) {
                                        field.onChange([...field.value, member.userId]);
                                      } else {
                                        field.onChange(
                                          field.value.filter((id) => id !== member.userId)
                                        );
                                      }
                                    }}
                                    className="rounded text-primary"
                                  />
                                  <label
                                    htmlFor={`user-${member.userId}`}
                                    className="text-sm flex items-center cursor-pointer"
                                  >
                                    <User className="h-4 w-4 mr-2 text-muted-foreground" />
                                    {member.username || member.firstName || member.userId}
                                  </label>
                                </div>
                              ))
                          ) : (
                            <div className="text-sm text-muted-foreground">
                              {selectedGroup 
                                ? "No members found in this group."
                                : "Select a group to see its members."}
                            </div>
                          )}
                        </div>
                        <div className="flex justify-between mt-2">
                          <FormDescription>
                            Select which members will receive images.
                          </FormDescription>
                          {membersQuery.data?.length ? (
                            <div className="flex space-x-2">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  const nonBotMembers = membersQuery.data
                                    .filter(member => !member.isBot)
                                    .map(member => member.userId);
                                  field.onChange(nonBotMembers);
                                }}
                              >
                                Select All
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => field.onChange([])}
                              >
                                Clear
                              </Button>
                            </div>
                          ) : null}
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="imagesToSend"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Number of Images</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              min={1} 
                              max={100} 
                              {...field}
                              onChange={(e) => field.onChange(parseInt(e.target.value))}
                            />
                          </FormControl>
                          <FormDescription>
                            How many images to send to each user.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="scheduledDate"
                      render={({ field }) => (
                        <FormItem className="flex flex-col">
                          <FormLabel>Schedule Date</FormLabel>
                          <Popover>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button
                                  variant={"outline"}
                                  className={cn(
                                    "pl-3 text-left font-normal",
                                    !field.value && "text-muted-foreground"
                                  )}
                                >
                                  {field.value ? (
                                    format(field.value, "PPP")
                                  ) : (
                                    "Send immediately"
                                  )}
                                  <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                </Button>
                              </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar
                                mode="single"
                                selected={field.value}
                                onSelect={field.onChange}
                                disabled={(date) =>
                                  date < new Date(new Date().setHours(0, 0, 0, 0))
                                }
                                initialFocus
                              />
                              <div className="p-3 border-t border-border">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => field.onChange(undefined)}
                                  className="w-full justify-center"
                                >
                                  Send immediately
                                </Button>
                              </div>
                            </PopoverContent>
                          </Popover>
                          <FormDescription>
                            When to send the images. Leave empty to send immediately.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <FormField
                    control={form.control}
                    name="messageTemplate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Message Template</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="@{username}, pics for {date}"
                            className="resize-y min-h-[80px]"
                            {...field} 
                          />
                        </FormControl>
                        <FormDescription>
                          Template for the message. Use {'{username}'} for the recipient's username and {'{date}'} for the current date.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="isRecurring"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>Recurring Send</FormLabel>
                          <FormDescription>
                            Enable to send images at a recurring schedule.
                          </FormDescription>
                        </div>
                      </FormItem>
                    )}
                  />
                  
                  {form.watch("isRecurring") && (
                    <div className="space-y-4 rounded-md border p-4">
                      <FormField
                        control={form.control}
                        name="recurringType"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Recurring Schedule</FormLabel>
                            <Select 
                              onValueChange={field.onChange}
                              value={field.value}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select schedule type" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="daily">Daily</SelectItem>
                                <SelectItem value="weekly">Weekly</SelectItem>
                                <SelectItem value="monthly">Monthly</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormDescription>
                              How often to send images.
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="timeOfDay"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Time of Day</FormLabel>
                            <FormControl>
                              <Input 
                                type="time" 
                                {...field} 
                              />
                            </FormControl>
                            <FormDescription>
                              What time of day to send the images.
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  )}
                  
                  <DialogFooter>
                    <Button 
                      type="submit"
                      disabled={createScheduledSendMutation.isPending}
                    >
                      {createScheduledSendMutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Creating...
                        </>
                      ) : (
                        "Schedule Send"
                      )}
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {scheduledSendsQuery.isLoading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : scheduledSendsQuery.data?.length ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {scheduledSendsQuery.data.map((send) => {
            // Use our display name function
            const groupDisplay = send.groupId ? getGroupDisplayName(send.groupId) : "Unknown Group";
            
            return (
              <Card key={send.id} className="overflow-hidden">
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-xl">{send.name}</CardTitle>
                    <div className={cn(
                      "px-2 py-1 rounded-full text-xs font-medium",
                      send.status === "pending" && "bg-blue-100 text-blue-800",
                      send.status === "in_progress" && "bg-yellow-100 text-yellow-800",
                      send.status === "completed" && "bg-green-100 text-green-800",
                      send.status === "failed" && "bg-red-100 text-red-800",
                    )}>
                      {send.status.replace("_", " ")}
                    </div>
                  </div>
                  <CardDescription>
                    Sending to {send.selectedUserIds.length} members of {groupDisplay}
                  </CardDescription>
                </CardHeader>
                <CardContent className="pb-2">
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Images per user:</span>
                      <span className="font-medium">{send.imagesToSend}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Scheduled for:</span>
                      <span className="font-medium">
                        {send.isRecurring 
                          ? `${send.recurringType} at ${send.timeOfDay || '9:00 AM'}`
                          : formatDate(send.scheduledDate)
                        }
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Created:</span>
                      <span className="font-medium">{format(new Date(send.createdAt), "PPP")}</span>
                    </div>
                    {send.completedAt && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Completed:</span>
                        <span className="font-medium">{format(new Date(send.completedAt), "PPP")}</span>
                      </div>
                    )}
                    {send.errorMessage && (
                      <div className="mt-2 p-2 bg-red-50 text-red-700 rounded text-xs">
                        {send.errorMessage}
                      </div>
                    )}
                  </div>
                </CardContent>
                <CardFooter className="pt-2">
                  {send.status === "pending" && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() => executeScheduledSendMutation.mutate(send.id)}
                      disabled={executeScheduledSendMutation.isPending}
                    >
                      {executeScheduledSendMutation.isPending && executeScheduledSendMutation.variables === send.id ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Executing...
                        </>
                      ) : (
                        <>
                          <PlayCircle className="mr-2 h-4 w-4" />
                          Execute Now
                        </>
                      )}
                    </Button>
                  )}
                  {send.status === "completed" && (
                    <div className="w-full flex justify-center items-center text-green-600 text-sm">
                      <Check className="mr-1 h-4 w-4" />
                      Completed Successfully
                    </div>
                  )}
                </CardFooter>
              </Card>
            );
          })}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center h-64 text-center">
          <div className="text-muted-foreground mb-4">
            No scheduled sends found
          </div>
          <Button
            onClick={() => setIsCreateDialogOpen(true)}
            variant="outline"
          >
            Create Your First Scheduled Send
          </Button>
        </div>
      )}
    </div>
  );
}