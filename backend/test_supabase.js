import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  const res2 = await supabase.from('chat_messages').select('*').limit(1);
  fs.writeFileSync('err.json', JSON.stringify(res2.error, null, 2));
}
test();
