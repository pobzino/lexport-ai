# Invoice System Testing Plan - Phase 1

## Overview
This testing plan covers all Phase 1 invoice features implemented in Lexport.

---

## Pre-requisites

Before testing, ensure:
1. Development server is running (`bun run dev`)
2. You have a logged-in user account
3. You have at least one contract with payment enabled
4. Stripe Connect is configured (for payment features)
5. Database has the `invoice_settings` table (migration applied)

---

## 1. Invoice Settings (Phase 1.6)

### 1.1 Settings Page Access
| Test | Steps | Expected Result |
|------|-------|-----------------|
| Navigate to settings | Go to `/settings` | See "Invoice Settings" card with Receipt icon |
| Click invoice settings | Click the Invoice Settings card | Redirected to `/settings/invoices` |
| Back navigation | Click back arrow | Returns to `/settings` |

### 1.2 Invoice Numbering
| Test | Steps | Expected Result |
|------|-------|-----------------|
| Default prefix | Load settings page fresh | Shows "INV-" as default prefix |
| Change prefix | Enter "LEX-" in prefix field | Field updates, preview shows "LEX-00001" |
| Preview updates | Change prefix to "ACME-" | Preview immediately shows "ACME-00001" |
| Next number display | Check next number field | Shows current next number (read-only) |
| Save prefix | Click Save Changes | Success message, settings persist on reload |

### 1.3 Company Information
| Test | Steps | Expected Result |
|------|-------|-----------------|
| Add company name | Enter "Test Company Inc" | Field accepts text |
| Add company address | Enter multi-line address | Textarea accepts newlines |
| Add logo URL | Enter valid image URL | Logo preview appears |
| Invalid logo URL | Enter invalid URL | Preview shows "Failed to load" |
| Save company info | Click Save Changes | Settings persist on reload |

### 1.4 Payment Terms
| Test | Steps | Expected Result |
|------|-------|-----------------|
| Default terms | Load settings fresh | Shows "Net 30" selected |
| Change to Net 7 | Select "Net 7" from dropdown | Due days auto-updates to 7 |
| Change to Net 60 | Select "Net 60" from dropdown | Due days auto-updates to 60 |
| Due on Receipt | Select "Due on Receipt" | Due days auto-updates to 0 |
| Manual due days | Enter custom number in due days | Field accepts 0-365 |
| Invalid due days | Enter 400 | Shows validation error on save |

### 1.5 Default Notes
| Test | Steps | Expected Result |
|------|-------|-----------------|
| Add notes | Enter "Thank you for your business" | Field accepts text |
| Long notes | Enter 500+ characters | Field accepts long text |
| Save notes | Click Save Changes | Notes persist on reload |

### 1.6 Settings API
| Test | Steps | Expected Result |
|------|-------|-----------------|
| GET settings | `curl /api/invoices/settings` | Returns settings JSON or defaults |
| PUT settings | Update settings via API | Returns updated settings |
| POST next number | `POST /api/invoices/settings` | Returns next invoice number, increments counter |
| Unauthorized access | Call API without auth | Returns 401 Unauthorized |

---

## 2. Invoice PDF Improvements (Phase 1.3)

### 2.1 PAID Watermark
| Test | Steps | Expected Result |
|------|-------|-----------------|
| Paid invoice PDF | Download PDF for paid invoice | Shows diagonal "PAID" watermark (light green, 15% opacity) |
| Unpaid invoice PDF | Download PDF for pending invoice | No PAID watermark visible |
| Void invoice PDF | Download PDF for void invoice | No PAID watermark visible |

### 2.2 Company Branding
| Test | Steps | Expected Result |
|------|-------|-----------------|
| Logo on PDF | Set logo in settings, generate PDF | Logo appears in top-left of PDF |
| Company name on PDF | Set company name in settings | Company name appears below logo |
| Company address on PDF | Set address in settings | Address appears in FROM section |
| No branding | Clear all settings, generate PDF | PDF shows without custom branding |

### 2.3 Payment Method Display
| Test | Steps | Expected Result |
|------|-------|-----------------|
| Paid with card | View PDF for card payment | Shows "Payment Method: card" |
| Paid with bank | View PDF for bank payment | Shows "Payment Method: bank_transfer" |
| Unpaid invoice | View PDF for pending invoice | No payment method shown |

### 2.4 QR Code
| Test | Steps | Expected Result |
|------|-------|-----------------|
| Unpaid invoice QR | Download PDF for unpaid invoice | QR code visible in bottom-left |
| Scan QR code | Scan with phone camera | Opens portal payment page |
| Paid invoice | Download PDF for paid invoice | No QR code visible |
| Void invoice | Download PDF for void invoice | No QR code visible |

---

## 3. Dashboard Enhancements (Phase 1.4)

### 3.1 Invoice Summary Stats
| Test | Steps | Expected Result |
|------|-------|-----------------|
| Stats visible | Go to `/dashboard` | See Invoice Stats section |
| Total Invoiced | Check total | Shows sum of all invoice amounts |
| Total Paid | Check paid amount | Shows sum of paid invoices only |
| Pending amount | Check pending | Shows sum of unpaid invoices |
| Zero state | New user with no invoices | Shows $0.00 for all stats |
| Currency format | Check amounts | Properly formatted (e.g., $1,234.56) |

### 3.2 Recent Invoices
| Test | Steps | Expected Result |
|------|-------|-----------------|
| Recent invoices list | Check dashboard | Shows up to 5 recent invoices |
| Invoice number | Check list items | Shows invoice number (e.g., INV-00001) |
| Contract title | Check list items | Shows associated contract title |
| Amount display | Check list items | Shows formatted amount |
| Status badge | Check list items | Shows paid/pending/draft badge |
| Download button | Click download icon | Downloads invoice PDF |
| Empty state | User with no invoices | Shows "No invoices yet" message |

### 3.3 Payment Status Filter
| Test | Steps | Expected Result |
|------|-------|-----------------|
| Filter visible | Go to `/contracts` | Payment filter dropdown visible |
| All Payments | Select "All Payments" | Shows all contracts |
| Fully Paid | Select "Fully Paid" | Shows only fully paid contracts |
| Partial | Select "Partial" | Shows contracts with deposit paid, balance due |
| Pending Payment | Select "Pending" | Shows contracts awaiting first payment |
| No Payment Required | Select this option | Shows contracts without payment requirement |
| Combined filters | Use with status filter | Both filters work together |
| Clear filters | Click clear button | Resets to show all |

---

## 4. Client Portal Features (Phase 1.5)

### 4.1 Portal Invoice List
| Test | Steps | Expected Result |
|------|-------|-----------------|
| Access portal | Use magic link to access portal | Portal loads successfully |
| Invoices section | Look for "Your Invoices" | Collapsible section visible |
| Expand invoices | Click "Your Invoices" header | List expands showing invoices |
| Invoice details | Check each invoice row | Shows number, amount, status, date |
| Status badges | Check status display | Correct colors for paid/pending/draft |
| Empty state | Client with no invoices | Shows appropriate message |

### 4.2 Portal PDF Download
| Test | Steps | Expected Result |
|------|-------|-----------------|
| Download button | Click PDF icon on invoice row | PDF downloads |
| PDF filename | Check downloaded file | Named `invoice-{number}.pdf` |
| PDF content | Open downloaded PDF | Shows correct invoice data |
| Unauthorized download | Try to download another client's invoice | Returns 404 error |

### 4.3 Payment History
| Test | Steps | Expected Result |
|------|-------|-----------------|
| Payment history section | Look for "Payment History" | Collapsible section visible |
| Expand payments | Click header | List expands showing payments |
| Payment details | Check each payment | Shows amount, date, status |
| Status indicators | Check status display | Green for succeeded, red for failed |
| Empty state | Client with no payments | Shows appropriate message |

---

## 5. API Endpoint Testing

### 5.1 Invoice Settings API
```bash
# Test GET (requires auth cookie)
curl -X GET http://localhost:3000/api/invoices/settings \
  -H "Cookie: <auth-cookie>"

# Test PUT
curl -X PUT http://localhost:3000/api/invoices/settings \
  -H "Content-Type: application/json" \
  -H "Cookie: <auth-cookie>" \
  -d '{"number_prefix": "TEST-", "default_due_days": 15}'

# Test POST (get next number)
curl -X POST http://localhost:3000/api/invoices/settings \
  -H "Cookie: <auth-cookie>"
```

### 5.2 Portal Invoices API
```bash
# Test GET all invoices (requires portal session)
curl -X GET http://localhost:3000/api/portal/invoices \
  -H "Cookie: <portal-session-cookie>"

# Test GET single invoice
curl -X GET http://localhost:3000/api/portal/invoices/{id} \
  -H "Cookie: <portal-session-cookie>"

# Test PDF download
curl -X GET "http://localhost:3000/api/portal/invoices/{id}?format=pdf" \
  -H "Cookie: <portal-session-cookie>" \
  -o invoice.pdf
```

---

## 6. Edge Cases & Error Handling

### 6.1 Settings Edge Cases
| Test | Expected Behavior |
|------|-------------------|
| Empty prefix | Should default to "INV-" |
| Very long prefix (50+ chars) | Should be accepted |
| Special characters in prefix | Should be accepted |
| Negative due days | Should show error |
| Due days > 365 | Should show error |
| Invalid logo URL | Preview fails gracefully |
| Missing company info | PDF generates without branding |

### 6.2 PDF Generation Edge Cases
| Test | Expected Behavior |
|------|-------------------|
| Very long company name | Text truncates appropriately |
| Multi-line address | Address wraps correctly |
| Large logo image | Logo scales to fit |
| Missing invoice data | PDF generates with defaults |
| No line items | PDF shows empty items section |
| Very many line items | PDF handles overflow |

### 6.3 Portal Access Edge Cases
| Test | Expected Behavior |
|------|-------------------|
| Expired session | Returns 401, redirects to login |
| Wrong email | Cannot see other clients' invoices |
| Deleted contract | Invoice still accessible |
| No contracts | Shows empty state message |

---

## 7. Performance Testing

| Test | Threshold |
|------|-----------|
| Settings page load | < 500ms |
| Settings save | < 1s |
| PDF generation | < 3s |
| Dashboard load with 100+ invoices | < 2s |
| Portal page load | < 1s |

---

## 8. Browser Compatibility

Test all features in:
- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)
- [ ] Mobile Safari (iOS)
- [ ] Chrome Mobile (Android)

---

## 9. Accessibility Testing

| Test | Expected Behavior |
|------|-------------------|
| Keyboard navigation | All controls accessible via Tab |
| Screen reader | Labels read correctly |
| Color contrast | Meets WCAG 2.1 AA |
| Focus indicators | Visible focus rings |

---

## Test Execution Checklist

### Critical Path (Must Pass)
- [ ] Invoice settings save and persist
- [ ] Invoice prefix applied to new invoices
- [ ] PDF generates with correct branding
- [ ] PAID watermark shows only on paid invoices
- [ ] QR code works on unpaid invoices
- [ ] Dashboard shows correct invoice stats
- [ ] Portal shows client's invoices only
- [ ] Portal PDF download works

### Nice to Have
- [ ] All edge cases handled gracefully
- [ ] Performance within thresholds
- [ ] Full browser compatibility
- [ ] Accessibility requirements met

---

## Bug Report Template

```
**Title**: [Brief description]
**Severity**: Critical/High/Medium/Low
**Feature**: [Which feature]
**Steps to Reproduce**:
1.
2.
3.

**Expected Result**:
**Actual Result**:
**Screenshots**: [if applicable]
**Browser/Device**:
```
