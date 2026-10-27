# OHRR Website — Progress Log

> The full log for the app **and** this website is the app repo's `docs/PROGRESS.md`
> (github.com/ohio-house-rabbit-rescue/ohrr-app, mirrored to the Drive folder
> "02 App Design" as `04-progress-log.md`). Entries here cover website-only notes.

## 2026-10-27

- **American English everywhere (2026-10-27, no database change).**
  Sponsor: "We use American English not European. stop using the other." British spellings in the app and the
  website, in page text, labels, built-in content and code comments, are now American: color, center, favorite,
  license, gray, catalog, behavior, honor, neighbor, labeled, program, recognize, organization, normalize, fiber,
  moldy, molting, labored, enroll, and canceled / canceling where it is only text people read. **Left alone on
  purpose** because the database or code depends on them: the booking, raffle and auction status `cancelled`, the
  auction `fulfil` fields, the breed list's `colours` field name, `license_number`, photo file names such as
  `bunny-grey-lop.jpg`, Wikimedia links, the generated `database.types.ts`, and the applied SQL migrations. Bunny Help
  search aliases keep both spellings ("diarrhoea" and "diarrhea"), so either one finds the topic; "towards" and
  "afterwards" stay (both fine in American English). **Still British, in the database:** the Bunny Help topics
  loaded into Supabase in September (breathing, spraying-mounting, new-bunny, bored-toys, hay-pellets, greens-fruit,
  foods-to-avoid: "Laboured", "behaviour", "fibre", "colourful", "favourites", "mouldy") show on both sites from the
  database, so they change only with a database update (not written) or by editing them in Staff → Bunny Help
  topics. BunFest 2026 vendor descriptions in the database were left as the vendors wrote them. Three comment-only
  fixes were skipped in files another session was editing at the same time (app `src/features/scan/labels.ts` and
  `src/features/scan/pages/PrintLabels.tsx`, website `src/pages/staff/PrintLabels.tsx`). Checks: app
  `npx tsc --noEmit -p .` and `npm run build`, website `npm run build`, all clean; browser pass on both sites' breed
  guide and breed pages, Privacy, Found, Settings, Give and Volunteer apply showed no British spellings left.
