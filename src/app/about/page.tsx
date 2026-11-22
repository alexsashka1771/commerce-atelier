import Link from "next/link";
export const metadata = { title: "Our story" };
export default function About() {
  return (
    <>
      <section className="about-hero page-container">
        <h1>
          Life isn’t a runway.
          <br />
          <em>Dress for living.</em>
        </h1>
        <p>
          Atelier began with a question: what if getting dressed felt a little
          simpler, and a little more like you?
        </p>
      </section>
      <div className="about-image">
        <img
          src="/images/capsule.webp"
          alt="Atelier linen, cotton and knit everyday wardrobe in natural tones"
          width="1000"
          height="600"
        />
      </div>
      <section className="about-body page-container">
        <div>
          <h2>
            Considered from
            <br />
            <em>the very first thread.</em>
          </h2>
          <p>
            We make a small collection of everyday pieces. Nothing excessive.
            Just natural fabrics, thoughtful cuts and the details you notice
            when you live in something.
          </p>
          <p>
            Our palette comes from the quiet things around us: oat fields, warm
            clay, fresh olive leaves. Our shapes leave space to move, sit, laugh
            and carry on with your day.
          </p>
          <div className="principles">
            <article>
              <h3>Materials that breathe.</h3>
              <p>
                Linen, organic cotton and honest textures. Chosen for how they
                feel against your skin.
              </p>
            </article>
            <article>
              <h3>A smaller point of view.</h3>
              <p>
                Six considered pieces. Small batches. We would rather make
                something good than something more.
              </p>
            </article>
            <article>
              <h3>Made to be lived in.</h3>
              <p>
                Easy care and everyday comfort. Pieces you can reach for without
                thinking twice.
              </p>
            </article>
          </div>
          <Link href="/collections" className="button">
            Meet your everyday <span>↗</span>
          </Link>
        </div>
      </section>
    </>
  );
}
