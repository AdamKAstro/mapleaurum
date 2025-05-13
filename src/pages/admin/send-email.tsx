//src/pages/admin/send-email.tsx

import React, { useState, FormEvent } from 'react';
import { Client as SendGridClient } from '@sendgrid/mail';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { supabase } from '../../lib/supabaseClient';
import { PageContainer } from '../../components/ui/page-container';
import { Typography } from '../../components/ui/typography';

const sgMail = new SendGridClient();
sgMail.setApiKey(import.meta.env.VITE_SENDGRID_API_KEY);

export function AdminSendEmailPage() {
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const checkAdmin = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    return user?.email === 'adamkiil79@gmail.com'; // Your admin email
  };

  const handleSend = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setStatus(null);

    if (!(await checkAdmin())) {
      setStatus('Unauthorized: Admin access required.');
      setLoading(false);
      return;
    }

    try {
      const msg = {
        to: email,
        from: 'support@mapleaurum.com',
        subject,
        text: message,
        html: `<p>${message}</p>`,
      };
      await sgMail.send(msg);
      setStatus('Email sent successfully!');
      setEmail('');
      setSubject('');
      setMessage('');
    } catch (error: any) {
      setStatus(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageContainer title="Admin: Send Test Email" description="Send test emails to debug delivery issues">
      <div className="max-w-md mx-auto p-4">
        {status && (
          <Typography
            variant="body"
            className={`p-2 mb-4 ${status.includes('Error') ? 'text-red-500' : 'text-green-500'}`}
          >
            {status}
          </Typography>
        )}
        <form onSubmit={handleSend} className="space-y-4">
          <Input
            type="email"
            placeholder="Recipient Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <Input
            type="text"
            placeholder="Subject"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            required
          />
          <Input
            type="text"
            placeholder="Message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            required
          />
          <Button type="submit" disabled={loading}>
            {loading ? 'Sending...' : 'Send Email'}
          </Button>
        </form>
      </div>
    </PageContainer>
  );
}