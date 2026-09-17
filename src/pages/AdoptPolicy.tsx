import { PageHero, Section, btn, ext, PrintButton, ArticleBody } from '../components/ui'
import { APPLY, ADOPTION_POLICY_PDF, OHRR } from '../lib/constants'

// Summary of the OHRR Adoption Policy PDF (Ohio House Rabbit Rescue, Inc., revised
// January 31, 2022), as linked from the live site. The PDF remains the official text.
const POLICY = `## Primary caregiver

When a rabbit is adopted from OHRR, the primary caregiver must be an adult. OHRR does not adopt rabbits as pets to children. The rabbit should be an integral part of the family and wanted by the entire family. All interactions with children and other household pets must be supervised.

OHRR will not adopt a rabbit into a home in which an individual resides who has ever been convicted of animal neglect or cruelty in any jurisdiction, or who breeds rabbits.

## Indoor housing

All rabbits adopted from OHRR must live indoors within the residential living space of the adopter — not outside, in a garage, or in an unfinished basement. The rabbit must live on the floor in an enclosure with no wire flooring and minimum dimensions of 4 feet by 4 feet, or free range in a room inside the home. In addition, the rabbit must have space and time for play and exercise, contiguous with its housing space. Flooring in the living and exercise areas must be carpet or rugs. OHRR generally does not adopt to homes where other pets are kept outside, and does not adopt into households that also have snakes or ferrets as pets.

## Social requirements

Rabbits are highly social beings, thriving in a stable atmosphere of companionship. The primary caregiver must be willing to create the necessary time in their lives for their new family member, including when life changes arise.

## Adoption of a bonded pair

Rabbits are not meant to live in solitude. Bonded pairs are rarely out of each other's sight; pairs are much easier to care for, get into less trouble, are happier, and tend to relate better to people. Two rabbits are generally not more expensive than one — the exception is medical care. If two rabbits up for adoption are a bonded pair, the adopter must adopt both and agree to keep them together.

## Neutering/spaying

All OHRR rabbits are spayed or neutered. If the adopted rabbit is to be a companion of an existing pet rabbit, the current rabbit must have been spayed or neutered at least one month before the introduction process. OHRR generally does not adopt to homes with other pets who are not spayed/neutered.

## Veterinary care

Rabbits require yearly wellness checks by a rabbit-experienced veterinarian. The adopter must be prepared to handle the financial responsibility associated with rabbit ownership.

## Nutritious diet

Limited, high-quality timothy pellets (one of OHRR's approved brands), unlimited high-quality grass hay, a daily salad of mixed fresh greens, and fresh water.

## Returns and exchanges

Rabbits live 8–12 years on average. Any rabbit adopted from OHRR must be returned to OHRR if the adopter can no longer care for it. The rabbit will be accepted back as soon as possible; the time frame can vary from a few weeks to a few months. OHRR will exchange rabbits on a case-by-case basis at the discretion of the Adoption Facilitator.

## Adoption fee

- Singles – $60
- Pairs – $75

## Adoption procedure

- Adoption Application: complete the online application. You will be contacted by email within 72 hours; if not, our system did not receive it — email ohrrcontact@ohiohouserabbitrescue.org. Next is a phone conversation with an Adoption Facilitator; if appropriate, an adoption appointment is scheduled.
- Meeting the rabbits: appointments are usually at 12:00 and 2:00 on Saturdays and Sundays, first come, first served. All family members are encouraged to participate and the primary caregiver must be present. Multiple visits may be needed, including to check for allergies. If a companion is being selected for an existing rabbit, the rabbits' reactions to each other determine the match.
- Homecoming: an "adopted" clip goes on the chosen rabbit's pen. You have a maximum of two weeks to set up housing and rabbit-proof; OHRR offers any support needed. Send photos of the habitat to your Adoption Facilitator; after approval, schedule a pick-up. At pick-up you sign the adoption contract and pay the fee.
- Follow-up: keep in touch with your Adoption Facilitator, especially in the first days and weeks. Call, text or email anytime with questions. Follow-up may include a phone call, text, or photos.`

export default function AdoptPolicy() {
  return (
    <>
      <PageHero
        title="Adoption Policy"
        subtitle="A plain-language summary of the OHRR Adoption Policy (revised January 31, 2022). The PDF on the OHRR site is the official text."
      />
      <Section className="print-urls">
        <div className="no-print flex flex-wrap gap-3">
          <PrintButton label="Print this policy" />
          <a href={ADOPTION_POLICY_PDF} {...ext} className={btn.blue}>
            Open the official PDF
          </a>
          <a href={APPLY} {...ext} className={btn.orange}>
            Adoption application
          </a>
        </div>
        <p className="print-only font-display text-2xl font-black">Ohio House Rabbit Rescue — Adoption Policy (summary)</p>
        <div className="mt-8 max-w-3xl">
          <ArticleBody body={POLICY} />
          <p className="mt-8 text-sm text-slate-600">
            All questions and inquiries may be directed to{' '}
            <a href={OHRR.emailHref} className="font-semibold text-brand-blue">
              {OHRR.email}
            </a>
            . Official document:{' '}
            <a href={ADOPTION_POLICY_PDF} {...ext} className="font-semibold text-brand-blue">
              Adoption Policy PDF
            </a>
            .
          </p>
        </div>
      </Section>
    </>
  )
}
