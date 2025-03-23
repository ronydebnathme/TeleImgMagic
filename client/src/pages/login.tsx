import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

// Define form schema
const formSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

type FormData = z.infer<typeof formSchema>;

export default function LoginPage() {
  const { user, isLoading, loginMutation } = useAuth();
  const { toast } = useToast();
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  
  // Get redirect parameter from URL or use dashboard as default
  const searchParams = new URLSearchParams(window.location.search);
  const redirectPath = searchParams.get('redirect') || '/dashboard';

  // Initialize form
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  // If already authenticated, redirect to dashboard
  useEffect(() => {
    if (user && !isLoading) {
      // Use direct window location for more reliable redirects
      window.location.href = redirectPath;
    }
  }, [user, isLoading, redirectPath]);

  const onSubmit = async (data: FormData) => {
    if (isLoggingIn) return; // Prevent multiple submissions
    
    setIsLoggingIn(true);
    try {
      await loginMutation.mutateAsync(data);
      
      // After successful login, redirect using window.location
      // This is more reliable than React Router for auth redirects
      toast({
        title: "Login successful",
        description: "Redirecting to dashboard..."
      });
      
      // Short delay to allow for the toast to be seen
      setTimeout(() => {
        window.location.href = redirectPath;
      }, 300);
      
    } catch (error: any) {
      // Error handling is done in the loginMutation itself
      console.error("Login error:", error);
    } finally {
      setIsLoggingIn(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-background">
      {/* Left side - Login form */}
      <div className="flex items-center justify-center w-full lg:w-1/2 p-10">
        <div className="w-full max-w-md">
          <Card className="border-border shadow-lg">
            <CardHeader className="space-y-1">
              <CardTitle className="text-2xl font-bold text-center">
                Sign in to your account
              </CardTitle>
              <CardDescription className="text-center">
                Enter your credentials to access the platform
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="username"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Username</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Enter your username" 
                            {...field} 
                            disabled={isLoggingIn}
                          />
                        </FormControl>
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
                          <Input 
                            type="password" 
                            placeholder="••••••••" 
                            {...field} 
                            disabled={isLoggingIn}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <Button 
                    type="submit" 
                    className="w-full" 
                    disabled={isLoggingIn}
                  >
                    {isLoggingIn ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Signing in...
                      </>
                    ) : (
                      "Sign in"
                    )}
                  </Button>
                </form>
              </Form>
            </CardContent>
            <CardFooter className="flex flex-col">
              <p className="mt-2 text-sm text-center text-muted-foreground">
                This application requires authorization. If you don't have access, please contact <strong>@itachiavm</strong>.
              </p>
            </CardFooter>
          </Card>
        </div>
      </div>
      
      {/* Right side - Hero section */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-r from-primary/20 to-primary/5 flex-col items-center justify-center p-10">
        <div className="max-w-xl">
          <h1 className="text-4xl font-bold mb-6 bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            Telegram Image Manipulation Platform
          </h1>
          <p className="text-lg mb-8 text-muted-foreground">
            Advanced web-based image processing, collaborative editing, and intelligent sharing capabilities 
            integrated with Telegram for seamless distribution.
          </p>
          <div className="space-y-4 text-muted-foreground">
            <div className="flex items-start">
              <span className="mr-2 text-primary">✓</span>
              <p>Process and manipulate images with advanced controls</p>
            </div>
            <div className="flex items-start">
              <span className="mr-2 text-primary">✓</span>
              <p>Distribute processed images through Telegram</p>
            </div>
            <div className="flex items-start">
              <span className="mr-2 text-primary">✓</span>
              <p>Schedule automated image distribution to groups</p>
            </div>
            <div className="flex items-start">
              <span className="mr-2 text-primary">✓</span>
              <p>Manage users and monitor activity through admin dashboard</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}