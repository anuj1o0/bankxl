import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import Nav from '@/components/Nav'
import Footer from '@/components/Footer'
import { BLOG_POSTS, ALL_BLOG_SLUGS } from './data'
import { resolveSiteUrl } from '@/lib/site-url'

const APP_URL = resolveSiteUrl()

interface Props { params: { slug: string } }

export function generateStaticParams() {
  return ALL_BLOG_SLUGS.map(slug => ({ slug }))
}

export function generateMetadata({ params }: Props): Metadata {
  const post = BLOG_POSTS[params.slug]
  if (!post) return {}

  const ogTitle = encodeURIComponent(post.title)
  const ogSub = encodeURIComponent(post.excerpt.slice(0, 100))

  return {
    title: post.title,
    description: post.metaDescription,
    keywords: post.keywords,
    alternates: { canonical: `/blog/${post.slug}` },
    openGraph: {
      title: post.title,
      description: post.metaDescription,
      url: `/blog/${post.slug}`,
      type: 'article',
      publishedTime: post.publishedISO,
      modifiedTime: post.updatedISO,
      authors: [post.author.name],
      images: [{ url: `/api/og?title=${ogTitle}&sub=${ogSub}`, width: 1200, height: 630 }],
    },
    twitter: { card: 'summary_large_image', title: post.title, description: post.metaDescription },
  }
}

export default function BlogPost({ params }: Props) {
  const post = BLOG_POSTS[params.slug]
  if (!post) notFound()

  const publishedFmt = new Date(post.publishedISO).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })

  const articleLD = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.title,
    description: post.metaDescription,
    author: { '@type': 'Organization', name: post.author.name },
    publisher: { '@type': 'Organization', name: 'BankXL', logo: { '@type': 'ImageObject', url: `${APP_URL}/favicon.svg` } },
    datePublished: post.publishedISO,
    dateModified: post.updatedISO,
    mainEntityOfPage: { '@type': 'WebPage', '@id': `${APP_URL}/blog/${post.slug}` },
  }

  const breadcrumbLD = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: APP_URL },
      { '@type': 'ListItem', position: 2, name: 'Blog', item: `${APP_URL}/blog` },
      { '@type': 'ListItem', position: 3, name: post.title, item: `${APP_URL}/blog/${post.slug}` },
    ],
  }

  const related = post.relatedSlugs.map(s => BLOG_POSTS[s]).filter(Boolean)

  return (
    <div className="grid-bg" style={{ minHeight: '100vh', background: 'var(--bg)', overflowX: 'hidden' }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleLD) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLD) }} />

      <div className="glow-blob" style={{ top: -220, right: -120 }} />
      <Nav />

      <div style={{ maxWidth: 960, margin: '0 auto', padding: '40px 24px 32px', position: 'relative' }}>

        <nav aria-label="Breadcrumb" style={{ fontSize: 12.5, color: 'var(--text-muted)', marginBottom: 22, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <Link href="/" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>Home</Link>
          <span aria-hidden>›</span>
          <Link href="/blog" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>Blog</Link>
          <span aria-hidden>›</span>
          <span style={{ color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 320 }}>{post.title}</span>
        </nav>

        {/* Header */}
        <header style={{ maxWidth: 760, margin: '0 auto 48px' }}>
          <div className="mono" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 11, color: 'var(--accent)', letterSpacing: 1.8, background: 'var(--accent-bg)', border: '1px solid var(--accent-border)', borderRadius: 999, padding: '5px 14px', marginBottom: 22 }}>
            {post.category.toUpperCase()} · {post.readMinutes} MIN READ
          </div>
          <h1 className="display" style={{ fontSize: 'clamp(30px, 4.4vw, 46px)', fontWeight: 700, lineHeight: 1.1, letterSpacing: '-0.03em', marginBottom: 18, color: 'var(--text-strong)' }}>
            {post.h1}
          </h1>
          <p style={{ fontSize: 17, color: 'var(--text-dim)', lineHeight: 1.65, marginBottom: 22 }}>
            {post.excerpt}
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 13, color: 'var(--text-muted)' }}>
            <div className="display" style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--gradient-brand)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 13 }}>
              {post.author.name[0]}
            </div>
            <span>
              <strong style={{ color: 'var(--text)' }}>{post.author.name}</strong> · {post.author.role}
            </span>
            <span style={{ color: 'var(--text-faint)' }}>·</span>
            <span>Published {publishedFmt}</span>
          </div>
        </header>

        <div className="post-layout" style={{ display: 'grid', gridTemplateColumns: '1fr 240px', gap: 40, alignItems: 'start' }}>

          <article style={{ maxWidth: 720 }}>
            {post.body()}

            {/* Inline CTA */}
            <div style={{
              margin: '48px 0 24px', padding: 26, borderRadius: 18,
              background: 'linear-gradient(140deg, var(--accent-bg), var(--info-bg))',
              border: '1px solid var(--accent-border)',
            }}>
              <div className="mono" style={{ fontSize: 11, color: 'var(--accent)', letterSpacing: 1.8, marginBottom: 8 }}>PRACTICE HERE</div>
              <h3 className="display" style={{ fontSize: 20, fontWeight: 700, letterSpacing: '-0.015em', marginBottom: 8, color: 'var(--text-strong)' }}>
                {post.cta.title}
              </h3>
              <p style={{ fontSize: 14, color: 'var(--text-dim)', lineHeight: 1.65, marginBottom: 16 }}>
                {post.cta.desc}
              </p>
              <Link href={post.cta.href} className="btn-primary" style={{ padding: '12px 22px', fontSize: 14 }}>
                {post.cta.label} →
              </Link>
            </div>

            {related.length > 0 && (
              <div style={{ marginTop: 40, borderTop: '1px solid var(--border)', paddingTop: 24 }}>
                <div className="mono" style={{ fontSize: 11, color: 'var(--text-muted)', letterSpacing: 1.8, marginBottom: 14 }}>KEEP READING</div>
                <div style={{ display: 'grid', gap: 10 }}>
                  {related.map(r => (
                    <Link key={r.slug} href={`/blog/${r.slug}`} className="card card-hover" style={{ padding: 16, textDecoration: 'none', display: 'block' }}>
                      <div style={{ fontSize: 14.5, fontWeight: 600, color: 'var(--text-strong)', marginBottom: 4 }}>{r.title}</div>
                      <div style={{ fontSize: 12.5, color: 'var(--text-dim)' }}>{r.excerpt.slice(0, 120)}…</div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </article>

          {/* Sticky ToC */}
          <aside className="post-toc" style={{ position: 'sticky', top: 88, alignSelf: 'start' }}>
            <div className="mono" style={{ fontSize: 10.5, color: 'var(--text-muted)', letterSpacing: 1.8, marginBottom: 12, paddingLeft: 4 }}>ON THIS PAGE</div>
            <nav>
              {post.tocItems.map(item => (
                <a key={item.id} href={`#${item.id}`} style={{
                  display: 'block', padding: '6px 10px', fontSize: 12.5,
                  color: 'var(--text-muted)', textDecoration: 'none',
                  borderLeft: '2px solid var(--border)', lineHeight: 1.5,
                }}>{item.label}</a>
              ))}
            </nav>
          </aside>
        </div>
      </div>

      <Footer />
    </div>
  )
}
