import { supabase } from './supabase/client';

interface SubscribeParams {
  email: string;
  firstName: string;
  lastName: string;
  location: string;
}

/**
 * Subscribe a user to the Mailchimp mailing list
 * This calls the subscribe-mailchimp edge function
 */
export async function subscribeToMailchimp(params: SubscribeParams): Promise<void> {
  try {
    const { data, error } = await supabase.functions.invoke('subscribe-mailchimp', {
      body: params,
    });

    if (error) {
      // Try to get more details from the error
      const errorDetails = {
        message: error.message,
        name: error.name,
        context: (error as any).context,
      };
      console.error('Error subscribing to Mailchimp:', JSON.stringify(errorDetails, null, 2));
      // Don't throw - we don't want to block registration if Mailchimp fails
      return;
    }

    if (data?.success) {
      console.log('Successfully subscribed to Mailchimp:', params.email);
    } else if (data?.error) {
      console.error('Mailchimp subscription failed:', data.error);
    }
  } catch (error) {
    console.error('Failed to subscribe to Mailchimp:', error);
    // Don't throw - we don't want to block registration if Mailchimp fails
  }
}
