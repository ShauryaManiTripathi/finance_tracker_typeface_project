# Gemini Vision API for Receipt & Statement Processing

## 🎯 Unified AI Approach

**Decision:** Use **Google Gemini Vision API** for BOTH receipt OCR and statement parsing instead of traditional OCR libraries (Tesseract.js).

---

## 💡 Why Gemini Over Tesseract?

### Traditional OCR (Tesseract.js) Limitations:
❌ **Poor Accuracy**: Struggles with:
- Poor lighting / shadows
- Blurry images
- Rotated/skewed receipts
- Handwritten text
- Non-standard fonts
- Crumpled paper

❌ **No Context Understanding**: 
- Just extracts raw text (not structured data)
- Can't distinguish merchant from date from amount
- Requires complex heuristics to parse "Total: $45.50" vs "Tax: $3.50"

❌ **Manual Parsing Required**:
- Need regex patterns for dates (DD/MM/YYYY, MM-DD-YYYY, etc.)
- Need to guess which line is the merchant
- Need to find "Total" vs "Subtotal" vs "Grand Total"

❌ **Format-Specific**:
- Receipt from Walmart ≠ Receipt from local store
- Different countries have different formats

---

### Gemini Vision Advantages:

✅ **High Accuracy**:
- State-of-the-art vision model
- Handles poor quality images
- Understands context (knows $45.50 near "Total" is the amount)

✅ **Structured Output**:
- Directly returns JSON: `{ merchant: "Walmart", amount: 45.50, date: "2025-10-07" }`
- No manual parsing needed
- Schema validation built-in

✅ **Context Awareness**:
- Understands receipt layout
- Knows to ignore header/footer
- Can extract itemized lists if needed

✅ **Universal**:
- Works with any receipt format
- Handles multiple languages (if needed)
- Adapts to new layouts automatically

✅ **Bonus: Works for PDFs too**:
- Single API for images AND PDFs
- No need for separate pdf-parse library

---

## 📋 Receipt Processing Flow (Gemini)

### 1. **User Uploads Receipt**
```
POST /api/uploads/receipt
Content-Type: multipart/form-data
File: grocery_receipt.jpg (photo from phone)
```

### 2. **Backend Processes with Gemini**
```typescript
// Upload to Gemini (if > 4MB) or use inline base64
const file = await uploadToGemini(receiptImage);

// Call Gemini Vision with structured output
const result = await model.generateContent({
  contents: [{
    role: 'user',
    parts: [
      { fileData: { mimeType: file.mimeType, fileUri: file.uri } },
      { text: 'Extract transaction details from this receipt. Return JSON with merchant name, date (YYYY-MM-DD), total amount, currency, and brief description.' }
    ]
  }],
  generationConfig: {
    responseMimeType: 'application/json',
    responseSchema: {
      type: 'object',
      properties: {
        merchant: { type: 'string' },
        date: { type: 'string' },
        amount: { type: 'number' },
        currency: { type: 'string' },
        description: { type: 'string' }
      },
      required: ['merchant', 'date', 'amount']
    }
  }
});
```

### 3. **Gemini Returns Structured JSON**
```json
{
  "merchant": "Walmart Supercenter",
  "date": "2025-10-07",
  "amount": 87.50,
  "currency": "INR",
  "description": "Groceries - milk, bread, vegetables"
}
```

### 4. **API Response**
```json
{
  "success": true,
  "candidate": {
    "type": "EXPENSE",
    "amount": 87.50,
    "currency": "INR",
    "occurredAt": "2025-10-07T00:00:00.000Z",
    "merchant": "Walmart Supercenter",
    "description": "Groceries - milk, bread, vegetables",
    "source": "RECEIPT"
  },
  "confidence": {
    "merchant": 0.98,
    "amount": 0.99,
    "date": 0.95
  }
}
```

### 5. **Frontend Pre-fills Form**
User sees:
```
✓ Merchant: Walmart Supercenter
✓ Amount: ₹87.50
✓ Date: Oct 7, 2025
✓ Description: Groceries - milk, bread, vegetables

[ Select Category: ] → User picks "Groceries"
[Save Transaction]
```

---

## 📊 Statement Processing (Already Gemini)

Statements continue to use Gemini with table extraction (no change needed).

---

## 🔑 Key Benefits Summary

| Aspect | Tesseract | Gemini Vision |
|--------|-----------|---------------|
| **Accuracy** | 60-80% | 95-99% |
| **Image Quality** | Requires high quality | Works with poor quality |
| **Output Format** | Raw text | Structured JSON |
| **Parsing Logic** | Complex heuristics | AI understanding |
| **Development Time** | High (custom parsing) | Low (just schema) |
| **Maintenance** | High (edge cases) | Low (model improves) |
| **Cost** | Free | ~$0.001 per image |
| **User Experience** | Often requires manual correction | Usually correct first time |

---

## 💰 Cost Analysis

**Gemini Pricing:**
- gemini-2.0-flash-exp: **FREE** (during preview)
- gemini-2.5-flash: ~$0.00125 per 1K tokens
- Average receipt image: ~300 tokens
- **Cost per receipt: $0.000375 (~₹0.03)**

**For 1000 users:**
- Avg 5 receipts/month = 5000 receipts
- Cost: 5000 × $0.000375 = **$1.875/month (~₹150/month)**

**Value vs Cost:**
- Traditional OCR: Free but poor UX → Users abandon app
- Gemini: Minimal cost but great UX → Users love app and stay

---

## 🛠️ Implementation Changes

### ✅ What Changed in SRS:

1. **F7 (Receipt Extraction):**
   - ~~OCR (Tesseract.js) + heuristic parsing~~
   - ✅ Gemini Vision with structured output

2. **Tech Stack:**
   - ~~Tesseract.js, pdf-parse~~
   - ✅ @google/generative-ai (unified)

3. **Receipt API Response:**
   - ~~rawText field for debugging~~
   - ✅ confidence scores for extracted fields

4. **Validation:**
   - ~~Heuristic patterns (regex)~~
   - ✅ Schema-enforced JSON

### 📦 Dependencies:

**Remove:**
- ❌ tesseract.js
- ❌ pdf-parse (optional, but Gemini handles PDFs)

**Keep:**
- ✅ @google/generative-ai
- ✅ multer (file uploads)
- ✅ ajv (JSON validation)

---

## 🚀 Next Steps

With SRS updated, we'll implement:

1. **Receipt Upload Module** (Gemini Vision)
   - POST /uploads/receipt endpoint
   - Gemini File API integration
   - Vision prompt with structured output schema
   - Response normalization

2. **Statement Import Module** (Gemini with tables)
   - POST /imports/ai/from-pdf endpoint
   - Table extraction with AI Table Schema v1
   - Preview/edit/commit flow

Both using **the same Gemini SDK** with different prompts and schemas! 🎉

---

## 📝 Example Prompt Engineering

### Receipt Extraction Prompt:
```
You are a financial assistant analyzing a receipt image.

Extract the following information:
1. Merchant name (store/restaurant name)
2. Transaction date (in YYYY-MM-DD format)
3. Total amount paid (as a number, without currency symbol)
4. Currency code (default "INR" if not specified)
5. Brief description (type of purchase or items bought)

Return ONLY valid JSON matching this schema. If any field is unclear, use your best judgment. If truly missing, set to null.
```

### Statement Extraction Prompt:
```
You are a financial assistant analyzing a bank statement PDF.

Extract all transaction rows from the statement as a structured table.

For each transaction, include:
- date: transaction date (YYYY-MM-DD)
- description: transaction description
- debit: debit amount (or null)
- credit: credit amount (or null)
- balance: running balance after transaction (or null)
- category: suggested category based on description (optional)

Return JSON matching the AI Table Schema v1.
```

---

## ✨ Summary

**Unified AI approach = Better accuracy + Less code + Consistent API**

No more juggling Tesseract for receipts and Gemini for statements. One SDK, two use cases, excellent results! 🎯
