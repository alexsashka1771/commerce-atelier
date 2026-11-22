import { ContactForm } from "@/components/contact-form";
export const metadata = { title: "A little conversation" };
export default function Contact() {
  return (
    <div className="page-container contact-page">
      <div className="page-heading">
        <h1>
          Good things start
          <br />
          <em>with a conversation.</em>
        </h1>
        <p>
          A question about a piece, a material, or something on your mind? We’re
          listening.
        </p>
      </div>
      <div className="contact-layout">
        <aside>
          <h2>
            Make yourself
            <br />
            <em>at home.</em>
          </h2>
          <p>
            Choosing the right size?
            <br />
            Curious about how a fabric feels?
            <br />
            We’re always happy to help.
          </p>
          <p>
            Studio hours
            <br />
            Monday–Friday, 9am–5pm
          </p>
          <span className="handwritten">A little care goes a long way.</span>
        </aside>
        <ContactForm />
      </div>
    </div>
  );
}
