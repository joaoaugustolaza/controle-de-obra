import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Cole aqui a URL do seu projeto Supabase (da barra do navegador)
const supabaseUrl = 'https://xkfuoqxidbkgleptivcc.supabase.co';

// Cole aqui a Publishable key que você copiou
const supabaseAnonKey = 'sb_publishable_tg9CX_Js-YhA-vzonWDl0Q_lNWkbIkF';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  localStorage: AsyncStorage,
  autoRefreshToken: true,
  persistSession: true,
});