# Developer Notes

## Google Analytics

GA4 is set up for tracking visits to [vandaycare.ca](https://vandaycare.ca).

- **Measurement ID:** `G-GM16Z1VGT9`
- **GA4 dashboard:** https://analytics.google.com/analytics/web/#/a47832599p533629741

The tracking snippet is in `index.html` inside the `<head>` tag.

---

## Custom Domain

The site is served at [vandaycare.ca](https://vandaycare.ca) via GitHub Pages.

- **Registrar:** Namecheap — [domain control panel](https://ap.www.namecheap.com/domains/domaincontrolpanel/vandaycare.ca/domain)
- **GitHub Pages custom domain:** set automatically via the `CNAME` file in the repo root

### Namecheap DNS records (Advanced DNS)

| Type | Host | Value |
|------|------|-------|
| A Record | @ | `185.199.108.153` |
| A Record | @ | `185.199.109.153` |
| A Record | @ | `185.199.110.153` |
| A Record | @ | `185.199.111.153` |
| CNAME Record | www | `yzhong52.github.io` |