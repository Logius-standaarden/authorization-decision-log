import { loadRespecWithConfiguration } from "https://logius-standaarden.github.io/publicatie/respec/organisation-config.mjs";
import { generateMermaidFigures } from "https://logius-standaarden.github.io/publicatie/respec/plugins/mermaid.mjs";

loadRespecWithConfiguration({
  useLogo: true,
  useLabel: true,
  license: "cc-by",
  specStatus: "WV",
  specType: "ST",
  pubDomain: "ftv",
  shortName: "adl",
  publishDate: "2024-05-19",
  publishVersion: "0.0.1",
  // TODO: verwijder voor publicatie
  prevVersion: [],
  latestVersion: "https://logius-standaarden.github.io/authorization-decision-log/",
  editors:
    [
      {
        company: "Logius",
        companyURL: "https://www.logius.nl",
        name: "Nil Barua"
      },
      {
        company : "Logius",
        companyURL : "https://www.logius.nl",
        name : "Stas Mironov"
      }
    ],
  authors:
    [
      {
        name: "Maikel Hofman",
        company: "VNG Realisatie",
        companyURL: "https://vng.nl/artikelen/vng-realisatie"
      },
      {
        name: "Guus van der Meer",
        company: "Vecozo",
        companyURL: "https://www.vecozo.nl/"
      },
      {
        name: "Michiel Trimpe",
        company: "VNG Realisatie",
        companyURL: "https://vng.nl/artikelen/vng-realisatie"
      }
    ],
  github: "https://github.com/Logius-standaarden/authorization-decision-log",

  postProcess: [generateMermaidFigures],

  localBiblio: {
    "AuthZen": {
      href: "https://openid.net/specs/authorization-api-1_0-03.html",
      title: "Authorization API 1.0 – draft 03",
      authors: ["O. Gazitt", "D. Brossard", "A. Tulshibagwale"]
    },
    "NIST.SP.800-162": {
      href: "https://www.nist.gov/publications/guide-attribute-based-access-control-abac-definition-and-considerations-1",
      title: "Guide to Attribute Based Access Control (ABAC) Definition and Considerations",
      authors: ["Chung Tong Hu", "David F. Ferraiolo", "David R. Kuhn"],
      date: "February 25, 2019"
    },
    "ISO/IEC 27001:2022": {
      href: "https://www.iso.org/standard/27001",
      title: "Information security, cybersecurity and privacy protection — Information security management systems — Requirements",
      date: "2022-10"
    },
    "ISO/IEC 27002:2022": {
      href: "https://www.iso.org/standard/75652.html",
      title: "Information security, cybersecurity and privacy protection — Information security controls",
      date: "2022-02"
    },
    "BIO2": {
      href: "https://www.bio-overheid.nl/media/cs5ctudu/20250924-baseline-informatiebeveiliging-overheid-2-bio2-v12-def.pdf",
      title: "Baseline Informatiebeveiliging Overheid 2",
      date: "24 september 2025"
    }
  },
});
