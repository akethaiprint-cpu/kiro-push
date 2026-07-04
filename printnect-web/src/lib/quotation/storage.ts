"use client";

/**
 * เก็บ/อ่านใบเสนอราคาล่าสุดผ่าน sessionStorage (ส่งข้อมูลข้ามหน้า calculator → quotation)
 */
import type { CalculationResult, Specs } from "@/domain/pricing/types";

export const QUOTE_STORAGE_KEY = "thaiprintnect:lastQuote";

export interface StoredQuote {
  system: string;
  productType: string;
  specs: Specs;
  result: CalculationResult;
}

export function saveQuote(quote: StoredQuote): void {
  try {
    sessionStorage.setItem(QUOTE_STORAGE_KEY, JSON.stringify(quote));
  } catch {
    /* ignore */
  }
}

export function loadQuote(): StoredQuote | null {
  try {
    const raw = sessionStorage.getItem(QUOTE_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as StoredQuote) : null;
  } catch {
    return null;
  }
}
