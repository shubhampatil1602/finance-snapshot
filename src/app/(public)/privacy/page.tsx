import type { Metadata } from "next"
import { Bullets, ProseSection, PublicHeader, TextLink } from "@/components/public/prose"
import { site } from "@/lib/site"

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: `How ${site.name} collects, uses, stores and protects your personal data.`,
  alternates: { canonical: "/privacy" },
}

export default function PrivacyPage() {
  const email = <TextLink href={`mailto:${site.contactEmail}`}>{site.contactEmail}</TextLink>

  return (
    <>
      <PublicHeader
        title="Privacy Policy"
        description={`This policy explains what ${site.name} (“we”, “us”) collects when you use the service, why, and the choices you have.`}
        updated={site.legalUpdated}
      />

      <ProseSection title="1. What we collect">
        <p>
          <strong>Account details.</strong> Your username, a hashed password, an encrypted recovery signature, your
          timezone and your currency preference. We do not ask for your real name, phone number or email address.
        </p>
        <p>
          <strong>Financial records you enter.</strong> Transactions, recurring items (bills, subscriptions, EMIs,
          SIPs), categories, payment-method labels, savings goals and contributions. We never ask for or store bank
          logins, card numbers or account numbers.
        </p>
        <p>
          <strong>Technical data.</strong> A session cookie to keep you signed in, and standard server logs from our
          hosting provider (IP address, browser type, request time) used for security and troubleshooting.
        </p>
      </ProseSection>

      <ProseSection title="2. How we use it">
        <Bullets>
          <li>To run the service: calculate your snapshot and show your own records back to you.</li>
          <li>To keep your account secure, including rate limiting failed logins and password recovery.</li>
          <li>To diagnose errors and keep the service available.</li>
        </Bullets>
        <p>
          We do <strong>not</strong> sell your data, show ads, build advertising profiles or share your records with
          third parties for their own purposes.
        </p>
      </ProseSection>

      <ProseSection title="3. Cookies">
        <p>
          We use one strictly necessary, HTTP-only cookie to keep you signed in. It expires after 30 days or when you
          log out. Your light/dark theme choice is saved in your browser&apos;s local storage. We use no analytics or
          tracking cookies.
        </p>
      </ProseSection>

      <ProseSection title="4. How we protect it">
        <Bullets>
          <li>Passwords are hashed with bcrypt and never stored in plain text.</li>
          <li>Your recovery signature is encrypted with AES-256-GCM.</li>
          <li>Session tokens are stored only as hashes; all traffic is served over HTTPS.</li>
          <li>Every database query is scoped to the signed-in account.</li>
        </Bullets>
        <p>No system is perfectly secure, but we take reasonable measures to protect your information.</p>
      </ProseSection>

      <ProseSection title="5. Where it's stored and who processes it">
        <p>
          Data is stored in a managed MongoDB database and the app is hosted on Vercel. These providers process data
          on our behalf only to operate the service and may store it in data centres outside your country.
        </p>
      </ProseSection>

      <ProseSection title="6. How long we keep it">
        <p>
          We keep your data while your account exists. Expired sessions are removed automatically. When you ask us to
          delete your account, we delete your records from the live database; copies in backups expire on the
          provider&apos;s normal backup schedule.
        </p>
      </ProseSection>

      <ProseSection title="7. Your rights">
        <p>Depending on where you live, you may have the right to access, correct, export or delete your data.</p>
        <Bullets>
          <li>
            <strong>Access & export:</strong> download all your data as JSON from Settings at any time.
          </li>
          <li>
            <strong>Correction:</strong> edit your records and profile directly in the app.
          </li>
          <li>
            <strong>Deletion:</strong> email {email} from the address you&apos;d like us to reply to, with your
            username, and we&apos;ll verify and delete your account.
          </li>
        </Bullets>
      </ProseSection>

      <ProseSection title="8. Children">
        <p>The service is not intended for anyone under 18, and we do not knowingly collect data from children.</p>
      </ProseSection>

      <ProseSection title="9. Changes to this policy">
        <p>
          If we make material changes, we&apos;ll update the date above and, where appropriate, tell you in the app.
          Continuing to use the service after a change means you accept the updated policy.
        </p>
      </ProseSection>

      <ProseSection title="10. Contact">
        <p>
          Questions about privacy? Email {email} or visit the <TextLink href="/contact">contact page</TextLink>.
        </p>
      </ProseSection>
    </>
  )
}
