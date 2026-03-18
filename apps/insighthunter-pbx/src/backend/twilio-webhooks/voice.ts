
import { Env } from '../types';

export const voice = async (request: Request, env: Env) => {
  // Handle incoming voice calls
  const twiml = new Twilio.twiml.VoiceResponse();
  twiml.say('Hello from your Twilio Functions app!');
  return new Response(twiml.toString(), { headers: { 'Content-Type': 'text/xml' } });
};
