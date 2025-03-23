import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useTelegramAuth, TelegramCredentials } from '@/hooks/useTelegramAuth';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardContent, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient, apiRequest } from '@/lib/queryClient';

// Define interface for Bot Configuration
interface BotConfig {
  id: number;
  triggerWords: string[];
  replyMessage: string;
  imagesToSend: number;
  foldersToSend: number;
  workInGroups: boolean;
  fileNameFormat: string;
  captionFormat: string;
  updatedAt: string;
}

export default function TelegramSettings() {
  const { connection, isLoadingConnection, setCredentials, refreshConnection, login, logout, isLoggingIn } = useTelegramAuth();
  const { toast } = useToast();
  
  const [credentials, setCredentialsForm] = useState<TelegramCredentials>({
    apiId: '',
    apiHash: '',
    phoneNumber: ''
  });

  const [loginCode, setLoginCode] = useState('');
  const [showLoginDialog, setShowLoginDialog] = useState(false);

  // State for bot configuration
  const [botConfig, setBotConfig] = useState<BotConfig | null>(null);
  
  // Query for getting bot configuration
  const botConfigQuery = useQuery({
    queryKey: ['/api/bot/config'],
    queryFn: async () => {
      const data = await apiRequest<BotConfig>('/api/bot/config');
      return data;
    }
  });
  
  // Mutation for updating bot configuration
  const updateBotConfigMutation = useMutation({
    mutationFn: async (config: Partial<BotConfig>) => {
      const response = await apiRequest('/api/bot/config', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(config),
      });
      return response;
    },
    onSuccess: () => {
      toast({
        title: "Configuration saved",
        description: "Bot settings updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/bot/config'] });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to save configuration",
        description: error.message || "An error occurred while saving the configuration",
        variant: "destructive",
      });
    }
  });
  
  // Effect to set bot configuration state when data is loaded
  useEffect(() => {
    if (botConfigQuery.data) {
      setBotConfig(botConfigQuery.data);
    }
  }, [botConfigQuery.data]);

  const handleCredentialsSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!credentials.apiId || !credentials.apiHash || !credentials.phoneNumber) {
      toast({
        title: "Missing fields",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }
    
    setCredentials(credentials);
    
    // After setting credentials, we might need to show the login dialog
    setShowLoginDialog(true);
  };

  const handleCodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!loginCode) {
      toast({
        title: "Missing code",
        description: "Please enter the verification code",
        variant: "destructive"
      });
      return;
    }
    
    login({ code: loginCode });
    setShowLoginDialog(false);
    setLoginCode('');
  };

  const handleCredentialsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setCredentialsForm(prev => ({ ...prev, [name]: value }));
  };
  
  // Handler for bot config text inputs
  const handleBotConfigChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    if (botConfig) {
      setBotConfig({ ...botConfig, [name]: value });
    }
  };
  
  // Function to save bot configuration changes
  const saveBotConfig = () => {
    if (botConfig) {
      const { fileNameFormat, captionFormat, imagesToSend, foldersToSend, workInGroups } = botConfig;
      updateBotConfigMutation.mutate({ 
        fileNameFormat,
        captionFormat,
        imagesToSend,
        foldersToSend,
        workInGroups
      });
    }
  };

  return (
    <div className="py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
        <h1 className="text-2xl font-semibold text-slate-800">Telegram Settings</h1>
      </div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 mt-6">
        <div className="bg-white shadow overflow-hidden sm:rounded-lg">
          <div className="px-4 py-5 border-b border-slate-200 sm:px-6">
            <h3 className="text-lg leading-6 font-medium text-slate-900">Telegram API Configuration</h3>
            <p className="mt-1 text-sm text-slate-500">
              Configure your Telegram API credentials to enable direct API access and bypass the 50MB file size limitation.
            </p>
          </div>
          
          <div className="px-4 py-5 sm:p-6">
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div>
                <h4 className="text-base font-medium text-slate-900 mb-4">Current Connection Status</h4>
                
                {isLoadingConnection ? (
                  <div className="flex items-center space-x-2">
                    <div className="animate-spin h-5 w-5 text-primary-600">
                      <i className="ri-loader-4-line"></i>
                    </div>
                    <span className="text-sm text-slate-500">Loading connection status...</span>
                  </div>
                ) : connection?.connected ? (
                  <div className="space-y-4">
                    <div className="flex items-center">
                      <div className="h-3 w-3 bg-green-500 rounded-full mr-2"></div>
                      <span className="text-sm font-medium text-green-500">Connected</span>
                    </div>
                    
                    <div className="space-y-2">
                      <div>
                        <Label className="text-xs text-slate-500">API ID</Label>
                        <div className="text-sm font-mono bg-slate-50 p-2 rounded border border-slate-200">
                          {connection.apiId}
                        </div>
                      </div>
                      
                      <div>
                        <Label className="text-xs text-slate-500">Phone Number</Label>
                        <div className="text-sm bg-slate-50 p-2 rounded border border-slate-200">
                          {connection.phoneNumber}
                        </div>
                      </div>
                      
                      <div>
                        <Label className="text-xs text-slate-500">Session Status</Label>
                        <div className="text-sm bg-slate-50 p-2 rounded border border-slate-200">
                          {connection.sessionStatus}
                        </div>
                      </div>
                    </div>
                    
                    <div className="pt-2 flex space-x-3">
                      <Button onClick={refreshConnection} variant="outline" size="sm">
                        <i className="ri-refresh-line mr-2"></i>
                        Refresh
                      </Button>
                      
                      <Button onClick={logout} variant="destructive" size="sm">
                        <i className="ri-logout-box-line mr-2"></i>
                        Logout
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="flex items-center">
                      <div className="h-3 w-3 bg-red-500 rounded-full mr-2"></div>
                      <span className="text-sm font-medium text-red-500">Not Connected</span>
                    </div>
                    <p className="mt-2 text-sm text-slate-500">
                      Please configure your Telegram API credentials below to connect.
                    </p>
                  </div>
                )}
              </div>
              
              <div>
                <h4 className="text-base font-medium text-slate-900 mb-4">API Credentials</h4>
                <form onSubmit={handleCredentialsSubmit} className="space-y-4">
                  <div>
                    <Label htmlFor="apiId">API ID</Label>
                    <Input
                      id="apiId"
                      name="apiId"
                      value={credentials.apiId}
                      onChange={handleCredentialsChange}
                      placeholder="Enter your Telegram API ID"
                      required
                    />
                    <p className="mt-1 text-xs text-slate-500">
                      You can obtain this from my.telegram.org
                    </p>
                  </div>
                  
                  <div>
                    <Label htmlFor="apiHash">API Hash</Label>
                    <Input
                      id="apiHash"
                      name="apiHash"
                      value={credentials.apiHash}
                      onChange={handleCredentialsChange}
                      placeholder="Enter your Telegram API Hash"
                      required
                      type="password"
                    />
                    <p className="mt-1 text-xs text-slate-500">
                      Keep this secret, it is used to authenticate with Telegram
                    </p>
                  </div>
                  
                  <div>
                    <Label htmlFor="phoneNumber">Phone Number</Label>
                    <Input
                      id="phoneNumber"
                      name="phoneNumber"
                      value={credentials.phoneNumber}
                      onChange={handleCredentialsChange}
                      placeholder="+1234567890"
                      required
                    />
                    <p className="mt-1 text-xs text-slate-500">
                      Full phone number including country code (e.g., +1234567890)
                    </p>
                  </div>
                  
                  <Button type="submit" className="w-full">
                    <i className="ri-save-line mr-2"></i>
                    Save Credentials & Connect
                  </Button>
                </form>
              </div>
            </div>
          </div>
          
          <div className="px-4 py-4 bg-slate-50 sm:px-6 border-t border-slate-200">
            <div className="text-sm text-slate-500">
              <p className="font-medium">How to get Telegram API credentials:</p>
              <ol className="mt-2 list-decimal list-inside space-y-1">
                <li>Go to <a href="https://my.telegram.org/" target="_blank" rel="noopener noreferrer" className="text-primary-600 hover:text-primary-800">my.telegram.org</a> and log in with your Telegram account</li>
                <li>Click on 'API development tools'</li>
                <li>Fill in the required fields (you can put 'Image Magic Tool' as the app title)</li>
                <li>The API ID and API Hash will be displayed to you</li>
              </ol>
            </div>
          </div>
        </div>
      </div>
      
      {/* Bot Configuration Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 mt-6">
        <Card>
          <CardHeader>
            <CardTitle>Bot Message & Zip Settings</CardTitle>
            <CardDescription>
              Configure how many images to include in each zip file, folder count, and message formatting options
            </CardDescription>
          </CardHeader>
          <CardContent>
            {botConfigQuery.isLoading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin h-8 w-8 text-primary-600">
                  <i className="ri-loader-4-line text-2xl"></i>
                </div>
              </div>
            ) : botConfig ? (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="imagesToSend">Images Per Zip File</Label>
                    <Input
                      id="imagesToSend"
                      name="imagesToSend"
                      type="number"
                      min={1}
                      max={100}
                      value={botConfig.imagesToSend}
                      onChange={(e) => setBotConfig({
                        ...botConfig,
                        imagesToSend: parseInt(e.target.value) || 1
                      })}
                    />
                    <p className="text-xs text-slate-500">
                      Number of images to include in each zip file (1-100)
                    </p>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="foldersToSend">Number of Folders</Label>
                    <Input
                      id="foldersToSend"
                      name="foldersToSend"
                      type="number"
                      min={1}
                      max={30}
                      value={botConfig.foldersToSend}
                      onChange={(e) => setBotConfig({
                        ...botConfig,
                        foldersToSend: parseInt(e.target.value) || 1
                      })}
                    />
                    <p className="text-xs text-slate-500">
                      Number of folders to include in each batch (1-30)
                    </p>
                  </div>
                </div>
                
                <Separator className="my-2" />
                
                <div className="flex items-center space-x-2 my-4">
                  <Switch
                    id="workInGroups"
                    checked={botConfig.workInGroups}
                    onCheckedChange={(checked) => setBotConfig({
                      ...botConfig,
                      workInGroups: checked
                    })}
                  />
                  <Label htmlFor="workInGroups" className="cursor-pointer">Enable Bot in Group Chats</Label>
                  <div className="ml-auto">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${botConfig.workInGroups ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                      {botConfig.workInGroups ? 'Enabled' : 'Disabled'}
                    </span>
                  </div>
                </div>
                <p className="text-xs text-slate-500 mb-4 -mt-2">
                  When enabled, the bot will respond to commands in group chats. When disabled, it will only respond in private chats.
                </p>
                
                <Separator className="my-2" />
                
                <div className="space-y-2">
                  <Label htmlFor="fileNameFormat">Filename Format</Label>
                  <Input
                    id="fileNameFormat"
                    name="fileNameFormat"
                    value={botConfig.fileNameFormat}
                    onChange={handleBotConfigChange}
                    placeholder="Photos-{date}-{username}"
                  />
                  <p className="text-xs text-slate-500">
                    Format for output filenames. You can use the following variables:
                    <br />
                    <code className="bg-slate-100 px-1 py-0.5 rounded">{'{username}'}</code> - Recipient's Telegram username
                    <br />
                    <code className="bg-slate-100 px-1 py-0.5 rounded">{'{date}'}</code> - Current date (YYYY-MM-DD)
                    <br />
                    <code className="bg-slate-100 px-1 py-0.5 rounded">{'{time}'}</code> - Current time (HH-MM)
                    <br />
                    <code className="bg-slate-100 px-1 py-0.5 rounded">{'{first_name}'}</code> - Recipient's first name
                  </p>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="captionFormat">Caption Format</Label>
                  <Textarea
                    id="captionFormat"
                    name="captionFormat"
                    value={botConfig.captionFormat}
                    onChange={handleBotConfigChange}
                    placeholder="Images processed for {username} on {date}"
                    rows={3}
                  />
                  <p className="text-xs text-slate-500">
                    Format for image captions. You can use the same variables as above.
                  </p>
                </div>
                
                <div className="pt-2">
                  <Button 
                    onClick={saveBotConfig}
                    disabled={updateBotConfigMutation.isPending}
                  >
                    {updateBotConfigMutation.isPending ? (
                      <>
                        <i className="ri-loader-4-line animate-spin mr-2"></i>
                        Saving...
                      </>
                    ) : (
                      <>
                        <i className="ri-save-line mr-2"></i>
                        Save Bot Settings
                      </>
                    )}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="py-4 text-center text-slate-500">
                Unable to load configuration. Please try refreshing the page.
              </div>
            )}
          </CardContent>
          <CardFooter className="bg-slate-50 border-t">
            <div className="text-xs text-slate-500">
              These settings control the number of images in each zip file, how many folders to include, whether the bot responds in group chats, and how your files are named and captioned when sent through Telegram.
            </div>
          </CardFooter>
        </Card>
      </div>
      
      {/* Login Dialog for verification code */}
      <Dialog open={showLoginDialog} onOpenChange={setShowLoginDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Enter Verification Code</DialogTitle>
            <DialogDescription>
              Please enter the verification code sent to your Telegram account
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleCodeSubmit} className="space-y-4 pt-4">
            <div>
              <Label htmlFor="loginCode">Verification Code</Label>
              <Input
                id="loginCode"
                value={loginCode}
                onChange={(e) => setLoginCode(e.target.value)}
                placeholder="Enter code"
                required
              />
            </div>
            
            <div className="flex justify-end space-x-3">
              <Button variant="outline" onClick={() => setShowLoginDialog(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isLoggingIn}>
                {isLoggingIn ? (
                  <>
                    <i className="ri-loader-4-line animate-spin mr-2"></i>
                    Verifying...
                  </>
                ) : (
                  <>Submit</>
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
