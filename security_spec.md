# Security Specification — DoctorZi Pediatric Neurology CRM & Calendar

## 1. Data Invariants
1. **Default-Deny Catch-All**: No Firestore path is readable or writable unless explicitly matched.
2. **PII Isolation**: Patient phone numbers, names, and notes inside `/bookings/{bookingId}` and `/operations/{operationId}` are strictly readable (`get`, `list`) ONLY by verified Doctor Admin (`email == 'saparovxudoynazar@gmail.com' && email_verified == true` or verified record in `/admins/{uid}`).
3. **Public Booking Create-Only Guard**: Website visitors may create a new `/bookings/{bookingId}` document ONLY when `status == 'new'`, `createdAt == request.time`, `code` matches `^DZ-[0-9]{6}$`, all strings adhere to strict `minLength`/`maxLength` boundaries, and no shadow keys exist (`hasOnly`). Public users can NEVER read, list, update, or delete bookings.
4. **Operation Calendar Integrity**: Only verified Doctor Admin can read, list, create, update, or delete `/operations/{operationId}`. `ownerId` must equal `request.auth.uid` on create and remain immutable on update; `createdAt` is immutable; `updatedAt == request.time`; `remindBeforeMinutes` is bounded (`size() <= 4`).
5. **Action-Based Updates & Terminal State Guard**: Updates to `/bookings` and `/operations` enforce `isValid[Entity](incoming())` and `affectedKeys().hasOnly(...)` with explicit admin override for terminal states (`completed`/`cancelled`).
6. **Non-Secret Settings**: `/crm_settings/{settingId}` contains only schedule times/toggles (never bot tokens); readable and writable strictly by verified Doctor Admin.
7. **Admin Registry Lockdown**: `/admins/{adminUid}` cannot be self-assigned by arbitrary users.

## 2. The "Dirty Dozen" Attack Payloads (All Must Return PERMISSION_DENIED)
1. **Unauthenticated PII Read**: Unauthenticated `get`/`list` on `/bookings` or `/operations`.
2. **Non-Admin Authenticated PII Read**: Signed-in non-admin user attempting `get`/`list` on `/bookings` or `/operations`.
3. **Email Spoofing Attack**: Token claiming admin email with `email_verified: false`.
4. **Shadow Field Injection on Booking Create**: Public booking payload adding `{ "isAdmin": true }` or `{ "role": "doctor_admin" }`.
5. **Status Bypass on Booking Create**: Public booking payload setting `{ "status": "confirmed" }` instead of `"new"`.
6. **Oversized String / DoW Attack**: Booking `notes` of 5,000 characters or `bookingId` of 256 invalid characters.
7. **Forged Timestamp on Create**: Booking or operation with client-spoofed `createdAt` != `request.time`.
8. **Identity Spoofing on Operation Create**: Creating an operation with `ownerId: "another_uid"`.
9. **Immutable Field Mutation**: Updating an operation attempting to change `createdAt` or `ownerId`.
10. **Unbounded Array Injection**: Operation with `remindBeforeMinutes` containing 15 elements (`size() > 4`) or non-integer values.
11. **Self-Assigned Admin Escalation**: Non-admin user creating `/admins/{theirUid}` with `{ "role": "doctor_admin" }`.
12. **Ghost Field Injection on Settings Update**: Updating `/crm_settings/default` with `{ "telegramBotToken": "123:abc" }`.
