import type { CareArticle } from '../lib/types'

// Fallback care articles — the real titles on https://ohiohouserabbitrescue.org/rabbit-care/resources/
// plus "Bunny Living Space", "Tips for Catching a Stray", "Bunny Diet" and "Foods to Avoid"
// from the live site's "I want to learn" section. Text is adapted from each live article
// (captured 2026-09-17). Bodies use the same light markdown as the app's care_articles
// table: blank-line paragraphs, `## ` headings, `- ` bullets. Items the live site hosts
// elsewhere (Small Pet Select, Binkybunny.com, rabbit.org) are linked, not copied.

export const CARE_DISCLAIMER =
  'General guidance to get you started — always consult a rabbit-savvy vet for medical concerns.'

export const sampleCareArticles: CareArticle[] = [
  {
    id: 's-diet',
    slug: 'bunny-diet',
    title: "Timothy? Alfalfa? What You Should Know About Your Bunny's Diet!",
    icon: 'apple',
    summary: 'Limited timothy pellets, unlimited timothy hay, and a daily fresh green salad.',
    sourceUrl: 'https://www.ohiohouserabbitrescue.org/bunnydiet/',
    body: `We see it all the time: someone brought their cute little bunny home from the pet store and had no idea what to feed it. We've had bunnies who were eating exclusively pellets, or bunnies who were fed only carrots. Once, we had a bunny who had lived on gerbil food, chicken nuggets and a Peep over the course of a year.

Feeding your rabbit a proper diet is more important than just good nutrition. Rabbits have unusually sensitive digestive systems, and a high-fiber diet of hay and pellets can prevent their digestive system from slowing, or worse, stopping entirely. Gastrointestinal stasis is extremely dangerous for rabbits and can be caused by insufficient fiber. Grinding hay also helps keep their teeth from getting too long.

## Three things, every day

Ohio House Rabbit Rescue recommends that your bunny's main diet include three things: limited timothy pellets, unlimited timothy hay, and a daily fresh green salad.

## Pellets

Pellets are high in calories and are used as a supplement. We recommend feeding 1/8 of a cup of high-quality pellets (such as Oxbow Essentials Adult Rabbit Food or Small Pet Select Premium Rabbit Food Pellets) per 4 lbs of bunny, although many bunnies are fine with less. Do not use pellets containing corn, seeds, or colorful pieces.

## The salad

The salad is where your bunny's most important nutrients come from. Almost all leafy greens are suitable, including things people might not normally eat, like beet greens or carrot tops. Be careful with spinach, mustard greens and kale (high in calcium), and never feed iceberg lettuce — it has no nutritional value. A good salad has a lettuce base (green leaf, romaine or butter lettuce) plus a few other herbs or greens depending on what your rabbit likes. Cilantro, radicchio, mint, parsley or basil are all great choices, and your bunny will let you know what he likes!

## Hay

The most important part of your rabbit's diet is hay. Hay is high in fiber, so it keeps your bunny's digestive system moving and keeps their teeth in shape. OHRR feeds our bunnies Oxbow Timothy Hay, but you can also use orchard grass and/or oat hay depending on your bunny's preferences. We also stock a variety of hay in the OHRR Hop Shop.

## Treats

All bunnies need to know they're adored, so feel free to give your bun an occasional treat. It's good to know your bunny's favorite treat in case you ever need to give medicine (particularly Metacam), which can be disguised by mixing it with a treat. Raisins or Craisins, baby carrots, small banana slices or strawberries make great treats — but too much sugar is not good. One baby carrot or one slice of banana per day is plenty.`,
    tip: 'A rabbit that stops eating or stops producing droppings needs a rabbit-savvy vet right away.',
  },
  {
    id: 's-diet-amounts',
    slug: 'bunny-diet-amounts',
    title: 'Bunny Diet: Food Amounts and a 48-Hour Care Schedule',
    icon: 'apple',
    summary: 'The typical daily diet of an OHRR bunny, and a two-day example of feeding and cleaning.',
    sourceUrl: 'https://www.ohrr.org/i-want-to-learn/bunny-diet/',
    body: `This is the typical diet of an OHRR bunny. It is intended to help you prepare for bringing a bunny into your home. Some bunnies have special needs and may have specific dietary requirements — please work with your Adoption Coordinator to determine specific needs.

## Food amounts

- Unlimited timothy hay: refresh their hay before they run out. There will always be some "wasted" hay that they don't eat, and this is OK. They should eat a volume about the size of their body every day.
- Greens/veggies: a variety of fresh greens every day — about 1 cup per 3 lbs of body weight, once a day or split into two feedings. Start with mostly green leaf lettuce (what we use at the rescue) and introduce new greens in small amounts to prevent digestive upset.
- Pellets: the amount at each meal (morning and evening) is set with your Adoption Coordinator, likely from 1 tablespoon to 1/4 cup based on the size of the bunny. Measure pellets exactly every time so you know if they aren't eating (which could mean they're sick). Only timothy-based pellets, such as Oxbow or Small Pet Select — never pellets with corn, seeds, or colorful pieces.
- Water: change daily. Rinse and wipe out the bowl before refilling to prevent algae.

## Day 1 — morning

- Small treat (to make sure they are eating and feeling well)
- Pellets
- Empty the water bowl and refill with fresh water
- Refresh hay in their litter box
- Let them out of their pen to play, if your schedule allows

## Day 1 — evening

- Pellets
- Top off the water bowl
- Refresh hay
- Greens (this can be done in the morning if that's more convenient)
- Out-of-pen time for exercise and time with their family
- Quickly clean their pen: wipe up any pee outside the box, sweep hay and poops, replace soiled rugs
- Treat to go back in their pen at bedtime

## Day 2 — morning

- Small treat
- Pellets
- Fresh water
- Refresh hay in their litter box
- Out-of-pen time if your schedule allows

## Day 2 — evening

- Pellets, top off water, greens, out-of-pen time
- Clean the litter box: dump everything, clean with a vinegar-and-water mixture in a spray bottle, then make a new box with litter on one side and a generous amount of hay on the other; put the litter side in the corner of the pen. OHRR cleans litter boxes 3 times per week.
- Quickly clean their pen, then a treat to go back in at bedtime`,
  },
  {
    id: 's-veg',
    slug: 'suggested-vegetables-and-fruits',
    title: 'Suggested Vegetables and Fruits for a Rabbit Diet',
    icon: 'apple',
    summary: 'The House Rabbit Society\'s full list of safe leafy greens, vegetables and fruit treats.',
    externalUrl: 'https://rabbit.org/suggested-vegetables-and-fruits-for-a-rabbit-diet/',
    externalSource: 'House Rabbit Society (rabbit.org)',
    body: `OHRR's diet guidance points to the House Rabbit Society for the full list of safe vegetables and fruits. A few of its key points:

- Hay should be about 80% of an adult rabbit's diet; fresh vegetables about 10%; fruit is a treat and under 5%.
- A good rule of thumb for adults is about one cup of packed greens for every two pounds of rabbit.
- Leafy greens should make up roughly three-quarters of the fresh vegetables fed daily.
- Introduce only one new green at a time and wait 24 hours before adding another, so you can tell if it disagrees with your bunny.
- Do not serve spoiled vegetables — rabbits can be even more sensitive than we are.

Read the full list, with notes on each vegetable, on rabbit.org.`,
  },
  {
    id: 's-avoid',
    slug: 'foods-to-avoid',
    title: 'Foods to Avoid',
    icon: 'info',
    summary: 'Do NOT feed these foods to your rabbit.',
    sourceUrl: 'https://www.ohrr.org/i-want-to-learn/foods-to-avoid/',
    body: `Do NOT feed these foods to your rabbit:

- Avocado
- Bamboo shoots
- Beans, dried
- Beans, raw: lima, kidney, soy
- Bracken fern
- Cabbage
- Chocolate
- Coffee beans and plant
- Corn in any form
- Dog/cat food
- Grains
- Honey/seed sticks
- House plants (most are toxic)
- Iceberg lettuce
- Meat
- Millet
- Nuts
- Onions
- Peas, dried
- "People food"
- Potatoes, including peels
- Refined sugars
- Rhubarb
- Sweet peas
- Sweet potatoes
- Tea leaves
- Whole seeds
- Yogurt drops
- ANYTHING MOLDY!

## Notes

- Flowers from the local nursery probably have pesticides on them. Don't serve them unless you know they are organic.
- Any foods that cause loose or mushy stool should be removed from the diet immediately!`,
  },
  {
    id: 's-top-ten-tips',
    slug: 'top-ten-tips-for-new-bunny-owners',
    title: 'Top Ten Tips for New Bunny Owners',
    icon: 'sparkles',
    summary: 'We asked and you answered: the top ten tips for new (or even experienced) bunny owners.',
    sourceUrl: 'https://ohiohouserabbitrescue.org/top_ten_tips_for_new_bunny_parents/',
    body: `We asked and you answered! Here are the top ten tips for new (or even experienced) bunny owners.

## 1. A rabbit-savvy vet is your new best friend

Rabbits are considered exotic pets and have different needs than dogs or cats, so make sure your vet has experience with bunnies. Even the best dog or cat vet may not know about your bunny's needs. Check out OHRR's list of rabbit vets in Ohio.

## 2. Get them fixed!

All rabbits from OHRR are spayed/neutered before being adopted. Spaying/neutering prevents unwanted litters and helps cut back on bad behavior such as aggression and marking territory. Older, unaltered rabbits are also at higher risk for certain cancers.

## 3. Think outside the hutch, and inside the house

Rabbits that live outdoors are susceptible to disease, insects and predators such as coyotes and hawks, not to mention extreme weather. Bunnies are very social pets and you're much less likely to get to know your bunny's personality if he or she is always outside.

## 4. Choose appropriate housing

Rabbits should be kept in a minimum of a 4x4 space on the floor without a wire bottom. OHRR recommends a 4x4 exercise pen, which can be purchased at the Hop Shop. Many rabbit parents give their bunny full ownership of an entire bedroom or even the house.

## 5. Bunny-proof your house

Protecting all loose cords, covering baseboards, and ensuring houseplants, remote controls, and even your favorite snacks are out of reach is a good start.

## 6. Bunnies will use a litter box

Rabbits prefer to do their business in one place, so they are easily litter box trained. Use a paper-based litter such as Yesterday's News, CareFresh or shredded newspaper, or pelleted horse bedding (kiln-dried pine or aspen) or wood stove pellets. Never use non-kiln-dried pine or cedar litter — it can damage the bunny's respiratory system.

## 7. Don't forget to play!

Bunnies need exercise and stimulation. Give your bunny at least an hour outside their space to run and play every day, and a variety of safe toys to toss, chew or dig.

## 8. A bunny's diet is essential

Limited pellets, unlimited hay and a daily salad. Treats on a limited basis, such as a teaspoon of carrot, banana or raisins per 2 pounds of body weight. A daily treat is a good health check — if she doesn't come out begging, something isn't right. Be careful with store-bought "rabbit treats"; many are not actually good for rabbits.

## 9. Do your research

Know about common rabbit illnesses such as GI stasis and bloat. Have a plan for emergencies and consider assembling a rabbit first-aid kit. Talk to your veterinarian and check out binkybunny.com and rabbit.org.

## 10. A bunny is a commitment, so enjoy it!

Rabbits can live 8–12 years. Spend time with your bunny and show your love through kisses and pets. Who knows — your bunny might just return the favor!`,
  },
  {
    id: 's-litter',
    slug: 'litter-box-training',
    title: 'Wait, Bunnies Can Be Litter Box Trained? How to Create the Perfect Litter Box, Tips on Training and More!',
    icon: 'home',
    summary: 'Just like cats, bunnies can be litter trained — which is why so many buns run free in the house.',
    sourceUrl: 'https://www.ohiohouserabbitrescue.org/litterbox/',
    body: `Just like cats, bunnies can be litter trained, which is why so many bunny owners are able to let their buns run free in the house. Most rabbits prefer to do their business in one spot, so litter training comes naturally.

## The perfect litter box

Ideally your rabbit is housed in a 4x4 space without a wire bottom, so a plastic cat litter box fits nicely. At the Adoption Center, our larger bunnies use low plastic storage tubs. Some bunny parents use the plastic tray from the bottom of a dog crate as an extra-large, super-low box — a good option for bunnies that have trouble climbing due to arthritis or age.

Litter should cover at least half the box. Paper-based litter such as CareFresh, Yesterday's News, or shredded newspaper (soy-based ink) is safe. Pelleted horse or cat bedding made from kiln-dried pine or aspen (such as Feline Pine) is another affordable option — it must be kiln-dried to remove harmful phenols. Wood stove pellets are also a great option.

Avoid clumping litter, deodorant crystals, corncob litter, and oat- or alfalfa-based litters (dangerous or toxic if eaten), and softwood (non-kiln-dried pine or cedar) or clay litters (dangerous if inhaled).

The other half of the box is where you keep your bunny's hay. Refill it daily. Hay in the box encourages your rabbit to get in the box and to eat their hay — rabbits like to munch while they do their business!

Clean the box at least every other day with a safe, non-toxic cleaner such as white vinegar or baking soda, or a product made for animals like Nature's Miracle.

## How to litter box train

Your rabbit must be spayed/neutered. Unaltered rabbits with raging hormones mark their territory with urine and are not easily trained.

Start small: put the litter box in the bunny's 4x4 space. If she goes in another area, move the box there until she starts using it. If she still refuses, temporarily reduce her space until she gets the idea.

Once she consistently uses the box, let her out with careful supervision, preferably in a small room. If she tries to urinate somewhere without a box, say "No" loudly and sharply and nicely herd her back to her box. Never scold her after the fact, and never, ever hit your rabbit. Give lots of praise whenever you see her using the box.

Increase her free space slowly as she stays consistent. If she has lots of space — especially stairs — multiple litter boxes help.

## Things to keep in mind

- If a bunny who has used the box for a long time suddenly starts urinating outside it, it could signal a urinary tract infection, bladder sludge, or bladder or kidney stones. If nothing in the home has changed, see a vet.
- Many bunnies continue to mark with a few poops outside the box even after spay/neuter, especially with another bunny in the home. Healthy poops are hard, dry and easy to clean up.
- Every bunny is different. If you're struggling, contact OHRR for support and advice.`,
    tip: "If you are struggling with litter box training, contact OHRR for support and advice.",
  },
  {
    id: 's-litter-stopped',
    slug: 'rabbit-stopped-using-the-litter-box',
    title: 'Help… My Rabbit Stopped Using the Litter Box!',
    icon: 'home',
    summary: 'An article by Small Pet Select on why a trained rabbit may stop using the box, and what to do.',
    externalUrl: 'https://smallpetselect.com/rabbit-stopped-using-litterbox/',
    externalSource: 'Small Pet Select',
    body: `This is an external article by Small Pet Select that OHRR recommends. It covers the common reasons a litter-trained rabbit starts going outside the box — hormones, territory, changes at home, and health problems — and how to get back on track.`,
  },
  {
    id: 's-bonding',
    slug: 'bonding-bunnies',
    title: 'The Art of Bunny Dating: Tips for Bonding Bunnies',
    icon: 'heart',
    summary: 'Tips and tricks for bonding two bunnies, from one of OHRR\'s bonding experts, Amy Shears.',
    sourceUrl: 'https://www.ohiohouserabbitrescue.org/bondingbunnies/',
    body: `If you have been working on bonding two of your bunnies for a while, or would like to know what it takes, OHRR bonding expert Amy Shears created this list of tips and tricks.

## Before you start

- Both rabbits should be spayed/neutered. Wait a few weeks after surgery before starting — it takes time for hormones to leave their systems.
- Let your rabbit choose who they want to live with. Bonding is much easier when they pick their own buddy.
- Let your bunny meet 2–3 rabbits during the dating process so you can compare. Male-female is usually easiest, but female-female and male-male can also work. Bonding is about personality, not size or breed.

## At home, at first

- Set their x-pens next to each other about 3 inches apart — close enough to see each other, not close enough to bite.
- Place food on the sides of the pens closest to each other so they eat within sight of one another.

## The dates

- Always start in a neutral area. The bathtub works well: it's slippery (hard to get footing to fight) and easy to slide one bunny away. Avoid spots where you can't reach them, like behind a toilet.
- Always have something on hand to stop a fight — a broom, a water spray bottle, something loud, or gloves. Never reach in bare-handed.
- Nipping will probably happen. It's normal and not always negative — sometimes it's a request for grooming.
- Pet both bunnies during dates to keep them calm; keep your hands on top of their heads, not near their mouths.
- Don't give them anything "territorial" at first — no litter box, hidey boxes or food. Add these slowly later, always in twos, with hidey boxes that have separate entrances and exits.
- Sessions may only last 10–15 minutes at first. Slowly increase the time until they can spend hours together.
- Stay with them at first, then leave for a few minutes at a time. Stay within earshot, and never leave them if they still have issues while you're there.

## Expect bumps

- Bunnies have bad days too. A bad date after great progress is normal.
- Moving to the next stage (say, from the bathtub to an x-pen in the living room) can feel like a step backwards. Hang in there.
- Every pair takes a different amount of time — sometimes months.
- Mounting is how bunnies establish dominance (and it isn't always the male). Pet the bottom bunny to keep them calm, wait a few seconds, then gently pull the top bunny off. If the bottom bunny won't tolerate it at all, separate immediately.
- Marking (poops along the pen closest to the other bunny) is normal during bonding and stops once they're bonded.
- Trust your instincts about when they're ready for the next stage.

## Help! My bunnies are fighting

Stress bonding helps rabbits learn to lean on each other. Try a car ride (two people: a driver and a watcher, bunnies together in a basket or box), a laundry basket on top of a washing machine on the spin cycle, running the vacuum nearby, carrying them around the house in a basket, or a walk in a pet stroller. Other ideas: try a different bonding area, rub a little banana on their noses so they groom each other, swap their enclosures or their litter boxes and toys so no space is "theirs," and give both bunnies separate run-around time before a date so they're too tired to fight.`,
    tip: 'OHRR offers free bunny matchmaking — bring your bunny to the Adoption Center for a bonding date.',
  },
  {
    id: 's-reasons',
    slug: 'top-ten-reasons-to-bring-a-bunny-into-your-life',
    title: 'Top Ten Reasons To Bring a Bunny Into Your Life',
    icon: 'heart',
    summary: 'Considering a rabbit, or a friend for your current rabbit? Here are our top ten reasons.',
    sourceUrl: 'https://www.ohiohouserabbitrescue.org/bunnies-top-ten/',
    body: `February is Adopt-a-Rabbit month, so here are our top ten reasons to add a bunny to your home.

## 10. They're eco-friendly

Bunnies love recycled toys like toilet paper rolls stuffed with hay, cardboard boxes with a door cut out, or an old phone book for digging. You can compost the entire litter box if you use a natural litter, and grow herbs and greens for them in your backyard.

## 9. Your bunny will be with you for a long time

Bunnies can live 10–12 years — lots of time with your new friend.

## 8. Allergic to dogs and cats? Try a bunny!

Some people who are allergic to dogs and/or cats are not allergic to bunnies.

## 7. Petting a bunny reduces stress

Watching an animal reduces cortisol and increases serotonin. Snuggling a bunny can even lower blood pressure.

## 6. They're great in apartments

They need a minimum 4x4 space during the day with time to roam in the evenings, they're quiet, they never need walks, and you don't need a backyard.

## 5. Compared to dogs or cats, they're fairly low-maintenance

No walks, and they can be litter box trained. They do need regular vet care and are not a "starter pet" for children, but they're pretty easy to care for.

## 4. They want to play when you do

Bunnies are crepuscular — most active in the mornings and evenings, right when you get home from work.

## 3. Bunnies are entertaining

Have you ever seen a bunny binky? Bunnies are intelligent; they can learn tricks and play games. It's even more fun with two.

## 2. They may be small, but they have BIG personalities

Sweet, friendly, sassy, energetic, goofy and a little bit of everything.

## 1. Bunnies make wonderful companions

They'll make you smile when you're down, listen when you need to talk, and snuggle you when you need a friend. Choosing to adopt gives a homeless bunny a forever home — stop by the Ohio House Rabbit Adoption Center and our volunteers will help you find your new furry friend.`,
  },
  {
    id: 's-spay',
    slug: 'spay-neuter',
    title: "Spay/Neuter: It's More than Population Control",
    icon: 'info',
    summary: 'Why spaying/neutering is best for your family, your house, your bunny, and the future.',
    sourceUrl: 'https://www.ohiohouserabbitrescue.org/spayneuter/',
    body: `Many people know about spaying and neutering dogs and cats, but some don't realize you can also spay/neuter your bunny. Groups like OHRR and House Rabbit Society chapters are changing the way people think about it, and can connect rabbit owners with experienced veterinarians.

## For your family

Altered rabbits no longer have the urge to mate, so they tend to be calmer and less aggressive. That means more petting, snuggling and bunny kisses.

## For your house

Altered bunnies are less prone to destructive chewing and digging, and are much easier to litter train. Unaltered males spray to mark territory — a nasty habit that can be avoided.

## For your bunny

Unaltered rabbits are prone to certain reproductive cancers; the risk is virtually eliminated by spaying/neutering. And while it's almost impossible to bond an unaltered rabbit, spaying/neutering lets bunnies be successfully bonded to a new friend.

## For the future

Spaying/neutering ensures you and your bunny won't be responsible for unwanted litters, so you won't contribute to bunny overpopulation.`,
    tip: 'Looking for a vet who spays/neuters rabbits? See our vets directory, including low-cost spay/neuter options.',
  },
  {
    id: 's-dig-chew',
    slug: 'digging-and-chewing',
    title: 'Staying Friends with your Bunny: How to Deal with Bunnies that Dig and Chew',
    icon: 'home',
    summary: 'Chewing and digging are natural. The key is redirecting them to things you don\'t mind losing.',
    sourceUrl: 'https://www.ohiohouserabbitrescue.org/diggingandchewing/',
    body: `Rabbits like to chew and dig. Chewing and digging are natural; the key is to redirect the behavior away from the items you want to keep intact and toward acceptable chew- and dig-ables. That takes three steps: teach your rabbit what they are and aren't allowed to chew and dig; block access to things that are too tempting; and give bunny toys he is allowed to use.

## Teaching "no"

Speak bunny language. From across the room, clap or thump to get his attention and let him know you don't like the behavior. Then walk over and put something he IS allowed to chew in front of his nose — toilet paper rolls work very well.

## Common targets, and removing temptation

- Baseboards: right at nose level. If your bunny has permanent access to a room, protect them with wooden boards or plastic.
- Wires: first choice is none in the bunny area; second, block access; third, encase them in plastic tubing (such as Critter Cord). Remember "temporary" cords like chargers and game controllers.
- Carpet: bunnies love irregular edges. Tightly woven carpet works best, with edges out of reach. Avoid shag — bad for the carpet and the digestive system. Area rugs work nicely.
- Furniture: legs and cushions get chewed, and rabbits may tunnel up into upholstered pieces from below. Remove the item or block access.
- Corners and enclosed spaces: rabbits love to dig and chew where these come together. Block access — or put the litter box in that corner, where they can safely dig and munch hay.

If you know your bunny will dig and chew what he shouldn't, don't leave him unsupervised in his play area.

## Toys for chewing and digging

- Cardboard boxes (which double as hidey-holes). Put cardboard, a blanket or a scrap of carpet under the box to protect your floor.
- Toilet paper and paper towel rolls, cereal boxes and paper bags stuffed with hay.
- A box full of shredded paper or child-safe play sand for diggers.
- Willow or twig chews — make sure they're non-toxic to rabbits and pesticide-free.
- Commercial bunny and small-animal toys.

Your bunny will always dig and chew. The goal is to get him to dig and chew what you consider appropriate. And another benefit of adoption: the volunteers at the Adoption Center usually know which bunnies dig and chew more than average, and can help you pick one that suits your home.`,
  },
  {
    id: 's-diy-toys',
    slug: 'diy-bunny-toys',
    title: 'Do-it-Yourself Bunny Toys',
    icon: 'sparkles',
    summary: 'You don\'t need to spend a lot to entertain your rabbit — most of what you need is already at home.',
    sourceUrl: 'https://www.ohiohouserabbitrescue.org/diy-bunny-toys/',
    body: `By Rebecca Allen. A rabbit is never happier than when he is playing! Many of the components you need to keep your bunny busy are probably already at home.

## Know your bunny's play style

Most rabbits enjoy digging and chewing, and many also enjoy tossing objects around. An ideal toy engages at least two of these behaviors. Watch your rabbit, figure out his favorite type of play, and tailor your toys accordingly.

## Bunny-safe materials for play

- Cardboard: a must-have. Remove any adhesives. Cut doors in boxes (at least two so bunny feels safe), use them as platforms, fill them with paper or hay to dig in, or put a big tube behind the couch as a tunnel. Stuff paper towel or toilet paper rolls with hay.
- Paper: Kraft paper or newspaper (most use soy-based inks). Fill boxes with it for burrowing, crumple it into a ball to toss, or drape it over bunny like a tent.
- Blankets and polar fleece: fleece is the only safe fabric for buns — the fibers are short enough not to cause digestive problems. Pile it up for digging, tie knots to chew on, or make a big fluffy ball to toss.
- Phone books: supervised only. Remove the covers and don't let bunny eat the adhesive on the spine. Great for digging and ripping.
- Pinecones (untreated only): bunnies love to chew and toss them, and they help wear down teeth.
- Willow baskets (untreated only): fun to nose around, hide treats in, and chew. Available at home décor stores or the OHRR Hop Shop.
- Repurposed toddler toys: hard plastic teething keys and wooden letter blocks are great for chewing and tossing.
- You: the best toy your rabbit can have. Get down on the floor, play peek-a-boo around a box, dig on blankets together. Give a new toy time — leave it where bunny can investigate, and model how to play with it.`,
  },
  {
    id: 's-cost',
    slug: 'how-much-does-a-house-rabbit-cost',
    title: 'How much does having a house rabbit really cost?',
    icon: 'info',
    summary: 'Binkybunny.com breaks down the real cost of a house rabbit — setup, food, and vet care.',
    externalUrl: 'https://www.binkybunny.com/BUNNYINFO/tabid/53/CategoryID/4/PID/940/Default.aspx',
    externalSource: 'Binkybunny.com',
    body: `This is an external article from Binkybunny.com that OHRR recommends. It walks through what a house rabbit really costs: initial setup (pen, litter box, bowls, carrier), ongoing food (hay, pellets, greens) and litter, and veterinary care — including the emergency fund every rabbit owner should have.`,
  },
  {
    id: 's-living-space',
    slug: 'bunny-living-space',
    title: 'Bunny Living Space',
    icon: 'home',
    summary: 'Ready to adopt? Here is what to include in your bunny\'s space, and tips before you bring them home.',
    sourceUrl: 'https://www.ohiohouserabbitrescue.org/i-want-to-learn/bunny-living-space/',
    body: `So, you're ready to adopt a bunny and you need to prepare their living space. You may not know where to start, but we can help. Many of the items you need are available in our Hop Shop; if we're out of stock or you'd prefer to buy elsewhere, we can tell you where they can typically be purchased.

## Housing requirements

Our housing requirement is a minimum 4 ft x 4 ft of indoor space in a location where the bunny is part of the family, can receive regular attention, and continues to be socialized. The bunny should also get out of that space for regular exercise. We do not permit small cages, outdoor hutches, or wire-bottom cages. Many of our adopted bunnies live in free-roam homes or have an entire room to themselves — great for the bunnies! We do advise "bunny proofing" by protecting exposed wires and cords with products such as Critter Cord or split wire loom tubing.

## Before you bring your bunny home

- In addition to housing items, you'll also want litter, pellets, hay and greens. See our bunny diet and litter box articles.
- We do not advise water bottles. They are messy and bunnies have difficulty drinking from them. In some special cases your adoption coordinator may advise them for medical reasons.
- Plenty of toys, regularly rotated, keep bunnies entertained and help prevent destruction elsewhere. When bunnies chew things that aren't theirs, it's usually because they don't have enough to chew.
- Many pet stores sell bunny toys labeled as safe that are not. Stay away from anything with nuts, seeds and corn. If you're unsure, avoid it. For safe toy ideas try binkybunny.com, smallpetselect.com, our wish list, or our DIY bunny toys article.
- Keep houseplants out of reach. They are poisonous to bunnies!`,
    tip: 'Worried about your bunny "marking" a new space? A 50/50 mix of distilled white vinegar and water in a spray bottle eliminates urine spots on floors, carpets and rugs, and is safe for the bunny. Add dish soap and warm water to clean the litter box.',
  },
  {
    id: 's-stray',
    slug: 'tips-for-catching-a-stray',
    title: 'Tips for Catching a Stray',
    icon: 'mappin',
    summary: 'Found a rabbit outdoors? How to tell if it is domestic, who to call, and how to catch it safely.',
    sourceUrl: 'https://www.ohiohouserabbitrescue.org/i-want-to-learn/tips-for-catching-a-stray/',
    body: `Ohio House Rabbit Rescue is frequently contacted by Good Samaritans about rabbits found outdoors in their yard or neighborhood.

## Domestic or wild?

The first thing to do is figure out if the rabbit is wild or domestic. Ohio's wild rabbits are cottontails — brown/grey with a white tail; if the rabbit doesn't look like that, it is domestic. If you're still unsure, Small Pet Select has a helpful article on wild bunnies vs. pet bunnies. If you need help with a wild rabbit that may be injured or in danger, contact the Ohio Wildlife Center.

If it is a domestic rabbit, it needs to be rescued — it does not have the means to survive in the wild. Occasionally a domestic rabbit escapes an outdoor enclosure, but in most cases they were intentionally "set free" by their previous owner.

## First: contact your local rabbit rescue with

- The location of the rabbit
- The time of day you saw the rabbit
- How long you have seen the rabbit (days, weeks, etc.)
- The color and approximate size of the rabbit

Your local rescue is probably entirely volunteer-based and may not be able to get someone out immediately. This is where you can help!

## Keep the rabbit nearby

At the very least, leave some water and food where you saw the rabbit. Green leaf or romaine lettuce with a few baby carrots or slices of banana should keep the rabbit coming back. Refresh daily if you can. Rabbits are creatures of habit and keep a daily routine as long as food and water are available along their route.

## Catching a stray rabbit

The best time to attempt a rescue is early morning or late evening, when rabbits are most active. If you don't see the rabbit, look under porches, cars, etc. — they hide and rest most of the day.

Some rabbits will let you slowly approach and pick them up; others run off at about 10 feet. If the rabbit lets you within a couple of feet, try tossing a large box or laundry basket over them. If not, try one of these — and above all, be patient. A rabbit is easier to catch once it trusts you and associates you with food.

- Exercise pens are what our volunteers use. The more pens (and helping hands) the better. Encircle the rabbit when it is cornered or hiding under something, or set the pens in a half circle at least 10 feet away and coax the rabbit in from the opposite side, then close the gap quickly.
- Live traps are often unsuccessful and should only be used if checked at least twice daily (morning and evening). Our volunteers more often catch opossums and raccoons instead. Be willing and able to safely release any wildlife. Place the trap in shade and out of plain sight, and line the bottom with hay, lettuce and treats.

## If you catch it

Have a pet carrier or crate ready, lined with newspaper or an old towel so the rabbit doesn't slip. Contact your local rabbit rescue or Humane Society about your capture; they can advise on care until a surrender date and time is worked out.

Note: occasionally multiple rabbits of opposite genders are abandoned at once, or a nest of domestic babies is found. These situations should be handled with extreme care. Babies cannot survive without their mother and should never be rescued without their mom.`,
    tip: 'In Columbus, report a stray to the CHRS Help Line at chrstipline@gmail.com — the Columbus Rabbit Field Rescue Facebook group coordinates rescues.',
  },
]
