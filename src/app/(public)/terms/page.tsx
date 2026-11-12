import type { Metadata } from "next"
import { Bullets, ProseSection, PublicHeader, TextLink } from "@/components/public/prose"
import { site } from "@/lib/site"

export const metadata: Metadata = {
  title: "Terms & Conditions",
  description: `The terms that govern your use of ${site.name}.`,
  alternates: { canonical: "/terms" },
}

export default function TermsPage() {
  return (
    <>
      <PublicHeader
        title="Terms & Conditions"
        description={`By creating an account or using ${site.name} (“the service”), you agree to these terms. If you don't agree, please don't use the service.`}
        updated={site.legalUpdated}
      />

      <ProseSection title="1. The service">
        <p>
          {site.name} is a personal budgeting tool that helps you track income, expenses, recurring payments and
          savings goals, and shows how much you can still spend in a month. It is provided free of charge.
        </p>
      </ProseSection>

      <ProseSection title="2. Not financial advice">
        <p>
          The service only organises and summarises numbers <strong>you</strong> enter. It does not provide
          financial, investment, tax or legal advice. Decisions you make based on it are your own responsibility.
          Figures are only as accurate as the data you record.
        </p>
      </ProseSection>

      <ProseSection title="3. Your account">
        <Bullets>
          <li>You must be at least 18 years old to create an account.</li>
          <li>Each account is for one person. Don&apos;t share it or use someone else&apos;s.</li>
          <li>
            Keep your password and unique signature secret. The signature is the <strong>only</strong> way to recover
            your account; if you lose both, we may be unable to restore access.
          </li>
          <li>You are responsible for activity that happens under your account.</li>
        </Bullets>
      </ProseSection>

      <ProseSection title="4. Acceptable use">
        <p>You agree not to:</p>
        <Bullets>
          <li>break the law or use the service to facilitate fraud or money laundering;</li>
          <li>attempt to access other users&apos; data or probe, scan or overload our systems;</li>
          <li>automate account creation or scrape the service;</li>
          <li>reverse-engineer the service except where the law allows it.</li>
        </Bullets>
      </ProseSection>

      <ProseSection title="5. Your data">
        <p>
          You own the data you enter. You give us permission to store and process it only so we can run the service
          for you, as described in our <TextLink href="/privacy">Privacy Policy</TextLink>. You can export it as
          JSON at any time.
        </p>
      </ProseSection>

      <ProseSection title="6. Availability and changes">
        <p>
          We aim to keep the service running but don&apos;t guarantee it will be uninterrupted or error-free. We may
          change, pause or discontinue features, or close new sign-ups. If we plan to shut the service down
          entirely, we&apos;ll give reasonable notice so you can export your data.
        </p>
      </ProseSection>

      <ProseSection title="7. Suspension and termination">
        <p>
          You can stop using the service at any time and ask us to delete your account. We may suspend or close
          accounts that breach these terms or put the service or other users at risk.
        </p>
      </ProseSection>

      <ProseSection title="8. Disclaimer">
        <p>
          The service is provided “as is” and “as available”, without warranties of any kind, express or implied,
          including fitness for a particular purpose, accuracy or non-infringement, to the extent the law allows.
        </p>
      </ProseSection>

      <ProseSection title="9. Limitation of liability">
        <p>
          To the fullest extent permitted by law, we are not liable for any indirect, incidental or consequential
          loss, or for loss of data, profits or savings, arising from your use of the service. Because the service is
          free, our total liability for any claim is limited to zero, except where the law does not allow such a
          limit.
        </p>
      </ProseSection>

      <ProseSection title="10. Changes to these terms">
        <p>
          We may update these terms. When we do, we&apos;ll change the date above. Continuing to use the service after
          an update means you accept the new terms.
        </p>
      </ProseSection>

      <ProseSection title="11. Contact">
        <p>
          Questions about these terms? Email{" "}
          <TextLink href={`mailto:${site.contactEmail}`}>{site.contactEmail}</TextLink> or visit the{" "}
          <TextLink href="/contact">contact page</TextLink>.
        </p>
      </ProseSection>
    </>
  )
}
