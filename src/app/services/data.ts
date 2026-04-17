import { Injectable } from '@angular/core';
import { SupabaseClient } from '@supabase/supabase-js';
import { supabase } from '../core/supabase.client';

@Injectable({
  providedIn: 'root',
})
export class Service { 

  private supabase: SupabaseClient;
  
  constructor() {this.supabase = supabase}

}

