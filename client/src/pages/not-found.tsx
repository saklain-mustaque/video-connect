import React from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Video, Home, ArrowLeft, Search } from 'lucide-react';
import { motion } from 'framer-motion';

const NotFoundPage: React.FC = () => {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-gray-950 dark:via-blue-950 dark:to-indigo-950 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-md"
      >
        <Card className="text-center bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm shadow-xl border-0">
          <CardHeader className="space-y-4 pb-6">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
              className="mx-auto w-16 h-16 bg-gradient-to-br from-gray-400 to-gray-600 rounded-2xl flex items-center justify-center"
            >
              <Search className="w-8 h-8 text-white" />
            </motion.div>
            <div>
              <CardTitle className="text-6xl font-bold text-gray-900 dark:text-white mb-2">
                404
              </CardTitle>
              <CardDescription className="text-xl">
                Page Not Found
              </CardDescription>
            </div>
          </CardHeader>
          
          <CardContent className="space-y-4">
            <p className="text-gray-600 dark:text-gray-400">
              The page you're looking for doesn't exist or may have been moved.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                onClick={() => setLocation('/home')}
                className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
              >
                <Home className="w-4 h-4 mr-2" />
                Go Home
              </Button>
              
              <Button
                onClick={() => window.history.back()}
                variant="outline"
                className="flex-1"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Go Back
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default NotFoundPage;
