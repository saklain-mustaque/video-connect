import React, { useState } from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Video, User, Mail, Lock, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { motion } from 'framer-motion';

const AuthPage: React.FC = () => {
  const [, setLocation] = useLocation();
  const { login, register, isLoading, error, clearError } = useAuth();
  const [activeTab, setActiveTab] = useState<'signin' | 'signup'>('signin');
  const [showPassword, setShowPassword] = useState(false);
  
  // Form states
  const [signinForm, setSigninForm] = useState({
    username: '',
    password: ''
  });
  
  const [signupForm, setSignupForm] = useState({
    username: '',
    displayName: '',
    email: '',
    password: '',
    confirmPassword: ''
  });

  const [formErrors, setFormErrors] = useState<{[key: string]: string}>({});

  const validateSigninForm = () => {
    const errors: {[key: string]: string} = {};
    
    if (!signinForm.username.trim()) {
      errors.username = 'Username is required';
    }
    
    if (!signinForm.password) {
      errors.password = 'Password is required';
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const validateSignupForm = () => {
    const errors: {[key: string]: string} = {};
    
    if (!signupForm.username.trim()) {
      errors.username = 'Username is required';
    } else if (signupForm.username.length < 3) {
      errors.username = 'Username must be at least 3 characters';
    }
    
    if (!signupForm.displayName.trim()) {
      errors.displayName = 'Display name is required';
    }
    
    if (signupForm.email && !/\S+@\S+\.\S+/.test(signupForm.email)) {
      errors.email = 'Please enter a valid email address';
    }
    
    if (!signupForm.password) {
      errors.password = 'Password is required';
    } else if (signupForm.password.length < 6) {
      errors.password = 'Password must be at least 6 characters';
    }
    
    if (signupForm.password !== signupForm.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSignin = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    
    if (!validateSigninForm()) return;
    
    try {
      await login(signinForm.username, signinForm.password);
      setLocation('/home');
    } catch (error) {
      // Error is handled by context
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    
    if (!validateSignupForm()) return;
    
    try {
      await register(
        signupForm.username,
        signupForm.displayName,
        signupForm.password,
        signupForm.email || undefined
      );
      setLocation('/home');
    } catch (error) {
      // Error is handled by context
    }
  };

  const handleTabChange = (tab: string) => {
    setActiveTab(tab as 'signin' | 'signup');
    clearError();
    setFormErrors({});
  };

  return (
    <div className="min-h-screen bg-background evtaar-gradient-bg evtaar-animated-bg flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <Card className="evtaar-card border-card-border">
          <CardHeader className="text-center space-y-4 pb-8">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
              className="mx-auto w-16 h-16 evtaar-gradient-primary rounded-2xl flex items-center justify-center evtaar-glow"
            >
              <Video className="w-8 h-8 text-primary-foreground" />
            </motion.div>
            <div>
              <CardTitle className="text-3xl font-bold evtaar-text-gradient">
                VideoConnect
              </CardTitle>
              <CardDescription className="text-base mt-2 text-muted-foreground">
                Connect, collaborate, and create together
              </CardDescription>
            </div>
          </CardHeader>
          
          <CardContent className="pb-8">
            <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-8">
                <TabsTrigger value="signin" className="text-sm font-medium">
                  Sign In
                </TabsTrigger>
                <TabsTrigger value="signup" className="text-sm font-medium">
                  Sign Up
                </TabsTrigger>
              </TabsList>
              
              {error && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="mb-6"
                >
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                </motion.div>
              )}
              
              <TabsContent value="signin">
                <form onSubmit={handleSignin} className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="signin-username" className="text-sm font-medium">
                      Username
                    </Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <Input
                        id="signin-username"
                        type="text"
                        placeholder="Enter your username"
                        value={signinForm.username}
                        onChange={(e) => setSigninForm({ ...signinForm, username: e.target.value })}
                        className={`pl-10 bg-input border-border focus:border-primary focus:ring-primary/20 ${formErrors.username ? 'border-destructive' : ''}`}
                        disabled={isLoading}
                      />
                    </div>
                    {formErrors.username && (
                      <p className="text-sm text-red-500">{formErrors.username}</p>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="signin-password" className="text-sm font-medium">
                      Password
                    </Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <Input
                        id="signin-password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Enter your password"
                        value={signinForm.password}
                        onChange={(e) => setSigninForm({ ...signinForm, password: e.target.value })}
                        className={`pl-10 pr-10 bg-input border-border focus:border-primary focus:ring-primary/20 ${formErrors.password ? 'border-destructive' : ''}`}
                        disabled={isLoading}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {formErrors.password && (
                      <p className="text-sm text-red-500">{formErrors.password}</p>
                    )}
                  </div>
                  
                  <Button
                    type="submit"
                    className="w-full evtaar-gradient-primary btn-primary text-primary-foreground font-semibold h-11"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Signing In...
                      </div>
                    ) : (
                      'Sign In'
                    )}
                  </Button>
                </form>
              </TabsContent>
              
              <TabsContent value="signup">
                <form onSubmit={handleSignup} className="space-y-5">
                  <div className="grid grid-cols-1 gap-5">
                    <div className="space-y-2">
                      <Label htmlFor="signup-username" className="text-sm font-medium">
                        Username
                      </Label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                        <Input
                          id="signup-username"
                          type="text"
                          placeholder="Choose a username"
                          value={signupForm.username}
                          onChange={(e) => setSignupForm({ ...signupForm, username: e.target.value })}
                          className={`pl-10 bg-input border-border focus:border-primary focus:ring-primary/20 ${formErrors.username ? 'border-destructive' : ''}`}
                          disabled={isLoading}
                        />
                      </div>
                      {formErrors.username && (
                        <p className="text-sm text-red-500">{formErrors.username}</p>
                      )}
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="signup-displayName" className="text-sm font-medium">
                        Display Name
                      </Label>
                      <Input
                        id="signup-displayName"
                        type="text"
                        placeholder="How others will see you"
                        value={signupForm.displayName}
                        onChange={(e) => setSignupForm({ ...signupForm, displayName: e.target.value })}
                        className={`bg-input border-border focus:border-primary focus:ring-primary/20 ${formErrors.displayName ? 'border-destructive' : ''}`}
                        disabled={isLoading}
                      />
                      {formErrors.displayName && (
                        <p className="text-sm text-red-500">{formErrors.displayName}</p>
                      )}
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="signup-email" className="text-sm font-medium">
                        Email <span className="text-gray-400">(Optional)</span>
                      </Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                        <Input
                          id="signup-email"
                          type="email"
                          placeholder="your@email.com"
                          value={signupForm.email}
                          onChange={(e) => setSignupForm({ ...signupForm, email: e.target.value })}
                          className={`pl-10 bg-input border-border focus:border-primary focus:ring-primary/20 ${formErrors.email ? 'border-destructive' : ''}`}
                          disabled={isLoading}
                        />
                      </div>
                      {formErrors.email && (
                        <p className="text-sm text-red-500">{formErrors.email}</p>
                      )}
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="signup-password" className="text-sm font-medium">
                        Password
                      </Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                        <Input
                          id="signup-password"
                          type={showPassword ? 'text' : 'password'}
                          placeholder="Create a password"
                          value={signupForm.password}
                          onChange={(e) => setSignupForm({ ...signupForm, password: e.target.value })}
                          className={`pl-10 pr-10 bg-input border-border focus:border-primary focus:ring-primary/20 ${formErrors.password ? 'border-destructive' : ''}`}
                          disabled={isLoading}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none"
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                      {formErrors.password && (
                        <p className="text-sm text-red-500">{formErrors.password}</p>
                      )}
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="signup-confirmPassword" className="text-sm font-medium">
                        Confirm Password
                      </Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                        <Input
                          id="signup-confirmPassword"
                          type={showPassword ? 'text' : 'password'}
                          placeholder="Confirm your password"
                          value={signupForm.confirmPassword}
                          onChange={(e) => setSignupForm({ ...signupForm, confirmPassword: e.target.value })}
                          className={`pl-10 bg-input border-border focus:border-primary focus:ring-primary/20 ${formErrors.confirmPassword ? 'border-destructive' : ''}`}
                          disabled={isLoading}
                        />
                      </div>
                      {formErrors.confirmPassword && (
                        <p className="text-sm text-red-500">{formErrors.confirmPassword}</p>
                      )}
                    </div>
                  </div>
                  
                  <Button
                    type="submit"
                    className="w-full evtaar-gradient-primary btn-primary text-primary-foreground font-semibold h-11"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Creating Account...
                      </div>
                    ) : (
                      'Create Account'
                    )}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default AuthPage;
