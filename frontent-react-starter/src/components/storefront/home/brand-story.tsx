import { Link } from "react-router-dom";
import { buttonVariants } from "@/components/ui/button";
import { PageContainer } from "@/components/storefront/page-container";
import { Reveal } from "@/components/storefront/reveal";
import { StaticImage } from "@/components/storefront/static-image";
import { HOME } from "@/lib/home-content";
import { cn } from "@/lib/utils";

const { eyebrow, title, description, cta, image } = HOME.story;

/**
 * "Câu chuyện thương hiệu": dải tối toàn chiều rộng. Phạm vi `dark` + `surface-sunken` (như chân trang) nên tối cố định; ảnh nền tĩnh phủ
 * `scrim/70` (đủ tối để chữ `ink` đạt tương phản ≥ 4,5:1 kể cả trên ảnh trắng; chữ phụ `ink-muted` KHÔNG đạt trên ảnh trắng nên khối này chỉ dùng `ink`); chưa có ảnh thì chỉ còn nền tối. Tiêu đề dùng serif NGHIÊNG THẬT
 * (Newsreader, chỉ khối này), nút là nút đặc của phạm vi tối nên sáng.
 */
function BrandStory() {
  return (
    <Reveal className="mt-block">
      <section
        aria-labelledby="home-story"
        className="dark relative isolate overflow-hidden bg-surface-sunken text-ink"
      >
        <StaticImage
          src={image.src}
          alt={image.alt}
          objectPosition={image.objectPosition}
          fallbackLetter={false}
        />
        <div aria-hidden="true" className="absolute inset-0 bg-scrim/70" />
        <PageContainer className="relative flex min-h-96 flex-col items-start justify-center gap-stack py-block">
          <p className="text-overline uppercase text-ink">{eyebrow}</p>
          <h2
            id="home-story"
            className="max-w-3xl font-serif text-display font-normal text-balance italic"
          >
            {title}
          </h2>
          <p className="max-w-prose text-body text-ink">{description}</p>
          <Link
            to="/products"
            className={cn(buttonVariants({ size: "lg" }), "press mt-2")}
          >
            {cta}
          </Link>
        </PageContainer>
      </section>
    </Reveal>
  );
}

export { BrandStory };
