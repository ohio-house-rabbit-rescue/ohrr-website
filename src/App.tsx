import { Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import { RABBIT_READY } from './lib/constants'
import Home from './pages/Home'
import Adopt from './pages/Adopt'
import AdoptRabbit from './pages/AdoptRabbit'
import AdoptPolicy from './pages/AdoptPolicy'
import Learn from './pages/Learn'
import LearnArticle from './pages/LearnArticle'
import LegacyFund from './pages/LegacyFund'
import StaffGuardians from './pages/staff/Guardians'
import MyAccount from './pages/staff/MyAccount'
import Vets from './pages/Vets'
import { BreedGuide, BreedDetail } from './pages/Breeds'
import Volunteer from './pages/Volunteer'
import BunFest from './pages/BunFest'
import SilentAuction from './pages/SilentAuction'
import MobileVet from './pages/MobileVet'
import VolunteerApply from './pages/VolunteerApply'
import VerifyLetter from './pages/VerifyLetter'
import { BunFestSchedule, BunFestTopic, BunFestVendors } from './pages/BunFestMore'
import Events from './pages/Events'
import Give from './pages/Give'
import About from './pages/About'
import Contact from './pages/Contact'
import Surrender from './pages/Surrender'
import HopShop from './pages/HopShop'
import News from './pages/News'
import GetApp from './pages/GetApp'
import Partners from './pages/Partners'
import PartnerPerks from './pages/PartnerPerks'
import Privacy from './pages/Privacy'
// Staff / owner backend (same Supabase as the app)
import { StaffProvider } from './lib/staff'
import StaffShell from './components/StaffShell'
import StaffDashboard from './pages/staff/Dashboard'
import ManageAnnouncements from './pages/staff/ManageAnnouncements'
import ManageHero from './pages/staff/ManageHero'
import ManageRabbits from './pages/staff/ManageRabbits'
import ManageVolunteer from './pages/staff/ManageVolunteer'
import ManageCare from './pages/staff/ManageCare'
import Team from './pages/staff/Team'
import Items from './pages/staff/Items'
import StaffHopShop from './pages/staff/HopShop'
import BunFestContent from './pages/staff/BunFestContent'
import HappyTails from './pages/staff/HappyTails'
import RaffleTicketsDesk from './pages/staff/RaffleTickets'
import Inbox from './pages/staff/Inbox'
import Bookings from './pages/staff/Bookings'
import Posts from './pages/staff/Posts'
import Flyers from './pages/staff/Flyers'
import Outreach from './pages/staff/Outreach'
import ManageImpact from './pages/staff/ManageImpact'
import ManageVets from './pages/staff/ManageVets'
import OrgDetails from './pages/staff/OrgDetails'
import Impact from './pages/Impact'
import Book, { BookCancel } from './pages/Book'
import { AdoptApply, SurrenderIntake, MailingList as MailingListPage, BecomeSupporter, FosterInterest } from './pages/Forms'
import PrintTags from './pages/staff/PrintTags'
import VolunteerCalls, { VolunteerCallRoute } from './pages/staff/VolunteerCalls'
import HoursLetter from './pages/staff/HoursLetter'
import VolunteerCall from './pages/VolunteerCall'
// Everything the app can do, on the website too (2026-09-23)
import Help from './pages/Help'
import HelpTopic from './pages/HelpTopic'
import Search from './pages/Search'
import Tails from './pages/Tails'
import TailDetail from './pages/TailDetail'
import ShareTail from './pages/ShareTail'
import Found from './pages/Found'
import FoundReport from './pages/FoundReport'
import Rescues from './pages/Rescues'
import RescueDetail from './pages/RescueDetail'
import MyHours from './pages/MyHours'
import BunnyHelp from './pages/staff/BunnyHelp'
import ManageEvents from './pages/staff/ManageEvents'
import ManageSponsors from './pages/staff/ManageSponsors'
import SponsorRenewals from './pages/staff/SponsorRenewals'
import Volunteers from './pages/staff/Volunteers'
import SilentAuctionManager from './pages/staff/SilentAuction'
import Features from './pages/staff/Features'
import Activity from './pages/staff/Activity'
import ResetPassword from './pages/staff/ResetPassword'
// One account for everyone (update 31): the email list
import EmailChoices from './pages/EmailChoices'
import Supporters from './pages/staff/Supporters'

export default function App() {
  return (
    <Routes>
      {/* The password-reset link lands here signed out, so it sits outside the shell */}
      <Route path="/staff/reset" element={<ResetPassword />} />

      {/* Staff area — its own shell, gated by sign-in + membership */}
      <Route
        path="/staff"
        element={
          <StaffProvider>
            <StaffShell />
          </StaffProvider>
        }
      >
        <Route index element={<StaffDashboard />} />
        <Route path="announcements" element={<ManageAnnouncements />} />
        <Route path="homepage" element={<ManageHero />} />
        <Route path="rabbits" element={<ManageRabbits />} />
        <Route path="volunteer" element={<ManageVolunteer />} />
        <Route path="care" element={<ManageCare />} />
        <Route path="vets" element={<ManageVets />} />
        <Route path="details" element={<OrgDetails />} />
        <Route path="team" element={<Team />} />
        <Route path="inbox" element={<Inbox />} />
        <Route path="bookings" element={<Bookings />} />
        <Route path="calls" element={<VolunteerCalls />} />
        <Route path="calls/:id" element={<VolunteerCallRoute />} />
        <Route path="hours-letter" element={<HoursLetter />} />
        <Route path="posts" element={<Posts />} />
        <Route path="flyers" element={<Flyers />} />
        <Route path="outreach" element={<Outreach />} />
        <Route path="impact" element={<ManageImpact />} />
        <Route path="items" element={<Items />} />
        <Route path="hopshop" element={<StaffHopShop />} />
        <Route path="hopshop/reorder" element={<StaffHopShop />} />
        <Route path="hopshop/suppliers" element={<StaffHopShop />} />
        <Route path="bunfest" element={<BunFestContent />} />
        <Route path="bunfest/pages" element={<BunFestContent />} />
        <Route path="bunfest/floor" element={<BunFestContent />} />
        <Route path="bunfest/vendors" element={<BunFestContent />} />
        <Route path="bunfest/partners" element={<BunFestContent />} />
        <Route path="tails" element={<HappyTails />} />
        <Route path="raffle-tickets" element={<RaffleTicketsDesk />} />
        <Route path="items/tags" element={<PrintTags />} />
        <Route path="events" element={<ManageEvents />} />
        <Route path="sponsors" element={<ManageSponsors />} />
        <Route path="sponsors/renewals" element={<SponsorRenewals />} />
        <Route path="guardians" element={<StaffGuardians />} />
        <Route path="supporters" element={<Supporters />} />
        <Route path="account" element={<MyAccount />} />
        <Route path="volunteers" element={<Volunteers />} />
        <Route path="auction" element={<SilentAuctionManager />} />
        <Route path="bunny-help" element={<BunnyHelp />} />
        <Route path="features" element={<Features />} />
        <Route path="activity" element={<Activity />} />
        <Route path="*" element={<StaffDashboard />} />
      </Route>

      {/* Public site */}
      <Route element={<Layout />}>
        <Route path="/" element={<Home />} />
        <Route path="/book/cancel/:token" element={<BookCancel />} />
        <Route path="/book/:slug" element={<Book />} />
        <Route path="/adopt" element={<Adopt />} />
        <Route path="/adopt/policy" element={<AdoptPolicy />} />
        <Route path="/adopt/apply" element={<AdoptApply />} />
        <Route path="/adopt/rabbit/:id" element={<AdoptRabbit />} />
        <Route path="/surrender/form" element={<SurrenderIntake />} />
        <Route path="/mailing-list" element={<MailingListPage />} />
        <Route path="/emails/:token" element={<EmailChoices />} />
        <Route path="/impact" element={<Impact />} />
        <Route path="/support/become-a-supporter" element={<BecomeSupporter />} />
        <Route path="/volunteer/foster" element={<FosterInterest />} />
        <Route path="/volunteer/interest" element={<VolunteerApply />} />
        <Route path="/volunteer/apply" element={<VolunteerApply />} />
        <Route path="/verify" element={<VerifyLetter />} />
        <Route path="/verify/:code" element={<VerifyLetter />} />
        <Route path="/learn" element={<Learn />} />
        <Route path="/learn/vets" element={<Vets />} />
        <Route path="/learn/breeds" element={<BreedGuide />} />
        <Route path="/learn/breeds/:slug" element={<BreedDetail />} />
        <Route path="/learn/:slug" element={<LearnArticle />} />
        {/* Give / Adopt / About pages brought in from the old site — same table, other sections */}
        <Route path="/info/legacy-fund" element={<LegacyFund />} />
        <Route path="/info/:slug" element={<LearnArticle />} />
        <Route path="/thinking-about-a-rabbit" element={<Navigate to={RABBIT_READY} replace />} />
        <Route path="/volunteer" element={<Volunteer />} />
        <Route path="/volunteer/call/:slug" element={<VolunteerCall />} />
        <Route path="/bunfest" element={<BunFest />} />
        <Route path="/bunfest/silent-auction" element={<SilentAuction />} />
        <Route path="/mobile-vet" element={<MobileVet />} />
        <Route path="/bunfest/schedule" element={<BunFestSchedule />} />
        <Route path="/bunfest/vendors" element={<BunFestVendors />} />
        <Route path="/bunfest/p/:slug" element={<BunFestTopic />} />
        <Route path="/events" element={<Events />} />
        <Route path="/give" element={<Give />} />
        <Route path="/about" element={<About />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/surrender" element={<Surrender />} />
        <Route path="/hop-shop" element={<HopShop />} />
        <Route path="/partners" element={<Partners />} />
        <Route path="/partners/perks" element={<PartnerPerks />} />
        <Route path="/news" element={<News />} />
        <Route path="/help" element={<Help />} />
        <Route path="/help/:slug" element={<HelpTopic />} />
        <Route path="/search" element={<Search />} />
        <Route path="/tails" element={<Tails />} />
        <Route path="/tails/share" element={<ShareTail />} />
        <Route path="/tails/:id" element={<TailDetail />} />
        <Route path="/found" element={<Found />} />
        <Route path="/found/report" element={<FoundReport />} />
        <Route path="/rescues" element={<Rescues />} />
        <Route path="/rescues/:id" element={<RescueDetail />} />
        <Route path="/volunteer/hours" element={<MyHours />} />
        <Route path="/volunteer/hours/:token" element={<MyHours />} />
        <Route path="/app" element={<GetApp />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="*" element={<Home />} />
      </Route>
    </Routes>
  )
}
