import React, { useState } from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Video, User, Mail, Lock, AlertCircle, Eye, EyeOff, Sparkles } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { motion } from 'framer-motion';
import ThemeToggle from '@/components/ThemeToggle';

const AuthPage: React.FC = () => {
  const [, setLocation] = useLocation();
  const { login, register, isLoading, error, clearError } = useAuth();
  const [activeTab, setActiveTab] = useState<'signin' | 'signup'>('signin');
  const [showPassword, setShowPassword] = useState(false);
  
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
    <div className="min-h-screen bg-background animated-gradient-bg flex items-center justify-center p-4">
      {/* Theme Toggle - Top Right */}
      <div className="fixed top-4 right-4 z-50">
        <ThemeToggle />
      </div>
      
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md relative z-10"
      >
        <Card className="modern-card border-card-border shadow-2xl">
          <CardHeader className="text-center space-y-6 pb-8 pt-8">
            {/* Logo */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
              className="mx-auto relative"
            >
              <div className="w-20 h-20 gradient-primary rounded-2xl flex items-center justify-center shadow-lg">
                <Video className="w-10 h-10 text-white" />
              </div>
              <motion.div
                className="absolute inset-0 gradient-primary rounded-2xl blur-xl opacity-50"
                animate={{
                  opacity: [0.3, 0.6, 0.3],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
              />
            </motion.div>
            
            {/* Title */}
            <div>
              <CardTitle className="text-3xl font-bold mb-2">
                <span className="text-gradient-primary">Video</span>
                <span className="text-foreground">Connect</span>
              </CardTitle>
              <CardDescription className="text-base text-muted-foreground flex items-center justify-center gap-2">
                <Sparkles className="w-4 h-4" />
                Professional video meetings
              </CardDescription>
            </div>
          </CardHeader>
          
          <CardContent className="pb-8 px-6">
            <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-8 h-12 p-1 bg-muted/50">
                <TabsTrigger 
                  value="signin" 
                  className="text-sm font-semibold rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all"
                >
                  Sign In
                </TabsTrigger>
                <TabsTrigger 
                  value="signup" 
                  className="text-sm font-semibold rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all"
                >
                  Sign Up
                </TabsTrigger>
              </TabsList>
              
              {error && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="mb-6"
                >
                  <Alert variant="destructive" className="border-destructive/50">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                </motion.div>
              )}
              
              {/* Sign In Tab */}
              <TabsContent value="signin">
                <form onSubmit={handleSignin} className="space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="signin-username" className="text-sm font-semibold">
                      Username
                    </Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                      <Input
                        id="signin-username"
                        type="text"
                        placeholder="Enter your username"
                        value={signinForm.username}
                        onChange={(e) => setSigninForm({ ...signinForm, username: e.target.value })}
                        className={`pl-10 h-11 bg-background/50 border-border/50 focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all duration-200 input-modern ${formErrors.username ? 'border-destructive focus:border-destructive focus:ring-destructive/10' : ''}`}
                        disabled={isLoading}
                      />
                    </div>
                    {formErrors.username && (
                      <p className="text-sm text-destructive">{formErrors.username}</p>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="signin-password" className="text-sm font-semibold">
                      Password
                    </Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                      <Input
                        id="signin-password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Enter your password"
                        value={signinForm.password}
                        onChange={(e) => setSigninForm({ ...signinForm, password: e.target.value })}
                        className={`pl-10 pr-10 h-11 bg-background/50 border-border/50 focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all duration-200 input-modern ${formErrors.password ? 'border-destructive focus:border-destructive focus:ring-destructive/10' : ''}`}
                        disabled={isLoading}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground focus:outline-none transition-colors"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {formErrors.password && (
                      <p className="text-sm text-destructive">{formErrors.password}</p>
                    )}
                  </div>
                  
                  <Button
                    type="submit"
                    className="w-full h-11 btn-primary text-primary-foreground font-semibold shadow-lg hover:shadow-xl transition-all duration-200"
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
              
              {/* Sign Up Tab */}
              <TabsContent value="signup">
                <form onSubmit={handleSignup} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-username" className="text-sm font-semibold">
                      Username
                    </Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                      <Input
                        id="signup-username"
                        type="text"
                        placeholder="Choose a username"
                        value={signupForm.username}
                        onChange={(e) => setSignupForm({ ...signupForm, username: e.target.value })}
                        className={`pl-10 h-11 bg-background/50 border-border/50 focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all duration-200 input-modern ${formErrors.username ? 'border-destructive focus:border-destructive focus:ring-destructive/10' : ''}`}
                        disabled={isLoading}
                      />
                    </div>
                    {formErrors.username && (
                      <p className="text-sm text-destructive">{formErrors.username}</p>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="signup-displayName" className="text-sm font-semibold">
                      Display Name
                    </Label>
                    <Input
                      id="signup-displayName"
                      type="text"
                      placeholder="How others will see you"
                      value={signupForm.displayName}
                      onChange={(e) => setSignupForm({ ...signupForm, displayName: e.target.value })}
                      className={`h-11 bg-background/50 border-border/50 focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all duration-200 input-modern ${formErrors.displayName ? 'border-destructive focus:border-destructive focus:ring-destructive/10' : ''}`}
                      disabled={isLoading}
                    />
                    {formErrors.displayName && (
                      <p className="text-sm text-destructive">{formErrors.displayName}</p>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="signup-email" className="text-sm font-semibold">
                      Email <span className="text-muted-foreground font-normal">(Optional)</span>
                    </Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                      <Input
                        id="signup-email"
                        type="email"
                        placeholder="your@email.com"
                        value={signupForm.email}
                        onChange={(e) => setSignupForm({ ...signupForm, email: e.target.value })}
                        className={`pl-10 h-11 bg-background/50 border-border/50 focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all duration-200 input-modern ${formErrors.email ? 'border-destructive focus:border-destructive focus:ring-destructive/10' : ''}`}
                        disabled={isLoading}
                      />
                    </div>
                    {formErrors.email && (
                      <p className="text-sm text-destructive">{formErrors.email}</p>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="signup-password" className="text-sm font-semibold">
                      Password
                    </Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                      <Input
                        id="signup-password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Create a password (min. 6 characters)"
                        value={signupForm.password}
                        onChange={(e) => setSignupForm({ ...signupForm, password: e.target.value })}
                        className={`pl-10 pr-10 h-11 bg-background/50 border-border/50 focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all duration-200 input-modern ${formErrors.password ? 'border-destructive focus:border-destructive focus:ring-destructive/10' : ''}`}
                        disabled={isLoading}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground focus:outline-none transition-colors"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {formErrors.password && (
                      <p className="text-sm text-destructive">{formErrors.password}</p>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="signup-confirmPassword" className="text-sm font-semibold">
                      Confirm Password
                    </Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                      <Input
                        id="signup-confirmPassword"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Confirm your password"
                        value={signupForm.confirmPassword}
                        onChange={(e) => setSignupForm({ ...signupForm, confirmPassword: e.target.value })}
                        className={`pl-10 h-11 bg-background/50 border-border/50 focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all duration-200 input-modern ${formErrors.confirmPassword ? 'border-destructive focus:border-destructive focus:ring-destructive/10' : ''}`}
                        disabled={isLoading}
                      />
                    </div>
                    {formErrors.confirmPassword && (
                      <p className="text-sm text-destructive">{formErrors.confirmPassword}</p>
                    )}
                  </div>
                  
                  <Button
                    type="submit"
                    className="w-full h-11 btn-primary text-primary-foreground font-semibold shadow-lg hover:shadow-xl transition-all duration-200 mt-6"
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
        
        {/* Footer text */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-center text-sm text-muted-foreground mt-6"
        >
          By continuing, you agree to our Terms of Service and Privacy Policy
        </motion.p>
      </motion.div>
    </div>
  );
};

export default AuthPage;
