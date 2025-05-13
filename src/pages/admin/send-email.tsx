//src/pages/admin/send-email.tsx
import React, { useState, useEffect, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { supabase } from '../../lib/supabaseClient';
import { PageContainer } from '../../components/ui/page-container';
import { Typography } from '../../components/ui/typography';
import mail from '@sendgrid/mail';

mail.setApiKey(import.meta.env.VITE_SENDGRID_API_KEY);

export function AdminSendEmailPage() {
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('Test Email from MapleAurum');
  const [message, setMessage] = useState('This is a test email sent from the MapleAurum Admin page.');
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const checkAdmin = async () => {
      try {
        // Refresh session to ensure user data is up-to-date
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) {
          console.error('[AdminSendEmailPage] Session error:', sessionError.message);
          navigate('/login');
          return;
        }

        if (!sessionData.session) {
          console.log('[AdminSendEmailPage] No active session, redirecting to login.');
          navigate('/login');
          return;
        }

        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError) {
          console.error('[AdminSendEmailPage] User fetch error:', userError.message);
          navigate('/login');
          return;
        }

        if (!user) {
          console.log('[AdminSendEmailPage] No user found, redirecting to login.');
          navigate('/login');
          return;
        }

        console.log('[AdminSendEmailPage] User data:', user); // Debug user object
        const adminCheck = user.email === 'adamkiil@outlook.com'; 
        setIsAdmin(adminCheck);
        if (!adminCheck) {
          console.log('[AdminSendEmailPage] User is not admin:', user.email);
          setStatus('Unauthorized: Admin access required.');
        }
      } catch (error: any) {
        console.error('[AdminSendEmailPage] Error checking admin:', error.message);
        setStatus('Error checking admin status. Please try again.');
        navigate('/login');
      } finally {
        setIsChecking(false);
      }
    };

    checkAdmin();
  }, [navigate]);

  const handleSend = async (e: FormEvent) => {
    e.preventDefault();
    if (!isAdmin) {
      setStatus('Unauthorized: Admin access required.');
      return;
    }

    setLoading(true);
    setStatus(null);

    try {
      const msg = {
        to: email,
        from: 'support@mapleaurum.com',
        subject,
        text: message,
        html: `<p>${message}</p>`,
      };
      await mail.send(msg);
      setStatus('Email sent successfully!');
      setEmail('');
      setSubject('Test Email from MapleAurum');
      setMessage('This is a test email sent from the MapleAurum Admin page.');
    } catch (error: any) {
      console.error('[AdminSendEmailPage] Error sending email:', error.message);
      setStatus(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  if (isChecking) {
    return (
      <PageContainer title="Loading..." description="Checking admin status...">
        <div className="text-center text-white">Loading...</div>
      </PageContainer>
    );
  }

  return (
    <PageContainer title="Admin: Send Test Email" description="Send test emails to debug delivery issues">
      <div className="max-w-md mx-auto p-4">
        {status && (
          <Typography
            variant="body"
            className={`p-2 mb-4 ${status.includes('Error') || status.includes('Unauthorized') ? 'text-red-500' : 'text-green-500'}`}
          >
            {status}
          </Typography>
        )}
        {isAdmin ? (
          <form onSubmit={handleSend} className="space-y-4">
            <Input
              type="email"
              placeholder="Recipient Email (e.g., sendgridtesting@gmail.com)"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
              className="bg-navy-600/80 border-navy-500 text-white"
            />
            <Input
              type="text"
              placeholder="Subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              required
              disabled={loading}
              className="bg-navy-600/80 border-navy-500 text-white"
            />
            <Input
              type="text"
              placeholder="Message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              required
              disabled={loading}
              className="bg-navy-600/80 border-navy-500 text-white"
            />
            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-700 hover:to-teal-700"
            >
              {loading ? 'Sending...' : 'Send Email'}
            </Button>
          </form>
        ) : (
          <Typography variant="body" className="text-red-500">
            Unauthorized: Admin access required.
          </Typography>
        )}
      </div>
    </PageContainer>
  );
}