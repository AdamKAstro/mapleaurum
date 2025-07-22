// src/pages/confirm-email/index.tsx
import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { PageContainer } from '../../components/ui/page-container';
import { Typography } from '../../components/ui/typography';
import { Button } from '../../components/ui/button';
import { Alert, AlertDescription } from '../../components/ui/alert';
import { Loader2, CheckCircle, XCircle, Mail } from 'lucide-react';
import { CustomAuthService } from '../../services/custom-auth-service.ts';

type ConfirmationStatus = 'loading' | 'success' | 'error' | 'invalid';

export function ConfirmEmailPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<ConfirmationStatus>('loading');
  const [errorMessage, setErrorMessage] = useState<string>('');
  
  const token = searchParams.get('token');
  const email = searchParams.get('email');

  useEffect(() => {
    const confirmEmail = async () => {
      // Validate parameters
      if (!token || !email) {
        setStatus('invalid');
        setErrorMessage('Invalid confirmation link. Missing required parameters.');
        return;
      }

      try {
        console.log('[ConfirmEmailPage] Confirming email for:', email);
        
        const { error } = await CustomAuthService.confirmEmail(token, decodeURIComponent(email));
        
        if (error) {
          setStatus('error');
          setErrorMessage(error.message);
          console.error('[ConfirmEmailPage] Confirmation error:', error);
        } else {
          setStatus('success');
          console.log('[ConfirmEmailPage] Email confirmed successfully');
          
          // Redirect to login after 3 seconds
          setTimeout(() => {
            navigate('/login?message=email_confirmed');
          }, 3000);
        }
      } catch (error) {
        console.error('[ConfirmEmailPage] Unexpected error:', error);
        setStatus('error');
        setErrorMessage('An unexpected error occurred. Please try again or contact support.');
      }
    };

    confirmEmail();
  }, [token, email, navigate]);

  const renderContent = () => {
    switch (status) {
      case 'loading':
        return (
          <div className="text-center">
            <Loader2 className="h-16 w-16 text-cyan-300 animate-spin mx-auto mb-6" />
            <Typography variant="h3" className="text-white mb-2">
              Confirming your email...
            </Typography>
            <Typography variant="body" className="text-gray-300">
              Please wait while we verify your email address.
            </Typography>
          </div>
        );

      case 'success':
        return (
          <div className="text-center">
            <CheckCircle className="h-16 w-16 text-emerald-500 mx-auto mb-6" />
            <Typography variant="h2" className="text-2xl sm:text-3xl font-bold text-white mb-4">
              Email Confirmed!
            </Typography>
            <Typography variant="body" className="text-gray-300 mb-6">
              Your email has been successfully confirmed. You can now sign in to your account.
            </Typography>
            <Alert className="mb-6 border-emerald-600/50 bg-emerald-900/20">
              <CheckCircle className="h-4 w-4 text-emerald-400" />
              <AlertDescription className="text-emerald-200">
                Redirecting you to the login page in a few seconds...
              </AlertDescription>
            </Alert>
            <Button
              onClick={() => navigate('/login')}
              size="lg"
              className="w-full bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-700 hover:to-cyan-700"
            >
              Go to Login
            </Button>
          </div>
        );

      case 'error':
        return (
          <div className="text-center">
            <XCircle className="h-16 w-16 text-red-400 mx-auto mb-6" />
            <Typography variant="h2" className="text-2xl sm:text-3xl font-bold text-white mb-4">
              Confirmation Failed
            </Typography>
            <Alert variant="destructive" className="mb-6">
              <AlertDescription>{errorMessage}</AlertDescription>
            </Alert>
            <div className="space-y-3">
              {errorMessage.includes('expired') && (
                <>
                  <Typography variant="body" className="text-gray-300 mb-4">
                    Your confirmation link has expired. Please request a new one.
                  </Typography>
                  <Button
                    onClick={() => navigate('/login?action=resend_confirmation')}
                    size="lg"
                    className="w-full"
                    variant="outline"
                  >
                    <Mail className="mr-2 h-5 w-5" />
                    Request New Confirmation Email
                  </Button>
                </>
              )}
              {errorMessage.includes('already been used') && (
                <>
                  <Typography variant="body" className="text-gray-300 mb-4">
                    Your email is already confirmed. Please sign in.
                  </Typography>
                  <Button
                    onClick={() => navigate('/login')}
                    size="lg"
                    className="w-full bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-700 hover:to-teal-700"
                  >
                    Go to Login
                  </Button>
                </>
              )}
              <Button
                onClick={() => navigate('/login')}
                size="lg"
                variant="outline"
                className="w-full border-gray-600 text-gray-300 hover:bg-gray-700/20"
              >
                Back to Login
              </Button>
            </div>
          </div>
        );

      case 'invalid':
        return (
          <div className="text-center">
            <XCircle className="h-16 w-16 text-red-400 mx-auto mb-6" />
            <Typography variant="h2" className="text-2xl sm:text-3xl font-bold text-white mb-4">
              Invalid Confirmation Link
            </Typography>
            <Typography variant="body" className="text-gray-300 mb-6">
              {errorMessage}
            </Typography>
            <Button
              onClick={() => navigate('/login')}
              size="lg"
              className="w-full"
              variant="outline"
            >
              Go to Login
            </Button>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <PageContainer
      title="Email Confirmation"
      description="Verify your email address to complete your registration"
      className="relative min-h-screen w-full overflow-hidden bg-gradient-to-b from-navy-900 via-navy-800 to-navy-900"
    >
      <div className="absolute inset-0 bg-cover bg-center opacity-30 -z-10" 
           style={{ backgroundImage: `url('/og-image.jpg')` }} 
           aria-hidden="true" />
      <div className="absolute inset-0 bg-noise opacity-20 -z-10" aria-hidden="true" />
      
      <div className="relative z-0 flex items-center justify-center min-h-[calc(100vh-150px)] px-4">
        <div className="max-w-lg w-full bg-navy-800/80 backdrop-blur-md shadow-xl rounded-lg p-6 sm:p-8">
          {renderContent()}
          
          <div className="mt-8 text-center">
            <Typography variant="bodySmall" className="text-xs text-gray-500">
              Need help? Contact{' '}
              <a href="mailto:support@mapleaurum.com" className="text-cyan-400 hover:underline">
                support@mapleaurum.com
              </a>
            </Typography>
          </div>
        </div>
      </div>
    </PageContainer>
  );
}