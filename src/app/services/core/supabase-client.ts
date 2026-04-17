import { Injectable } from '@angular/core';
import { SupabaseClient } from '@supabase/supabase-js';
import { supabase } from '../../core/supabase.client';

@Injectable({
  providedIn: 'root'
})
export class SupabaseClientService {
  private supabase: SupabaseClient;

  constructor() {
    this.supabase = supabase;
  }

  getClient(): SupabaseClient {
    return this.supabase;
  }

  from(table: string) {
    return this.supabase.from(table);
  }

  auth() {
    return this.supabase.auth;
  }

  functions() {
    return this.supabase.functions;
  }
}