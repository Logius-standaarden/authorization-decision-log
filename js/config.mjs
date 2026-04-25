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
        companyURL: "https://logius.nl",
        name: "Nil Barua"
      },
      {
        company : "Logius",
        companyURL : "https://logius.nl",
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
    "AuthZEN": {
      href: "https://openid.net/specs/authorization-api-1_0.html",
      title: "Authorization API 1.0",
      authors: ["O. Gazitt", "D. Brossard", "A. Tulshibagwale"]
    },
    "RFC9112": {
      href: "https://www.rfc-editor.org/rfc/rfc9112.html",
      title: "HTTP/1.1",
      authors: ["R. Fielding", "M. Nottingham", "J. Reschke"],
      date: "June 2022"
    },
    "RFC9113": {
      href: "https://www.rfc-editor.org/rfc/rfc9113.html",
      title: "HTTP/2",
      authors: ["M. Thomson", "C. Benfield"],
      date: "June 2022"
    },
    "NIST.SP.800-162": {
      href: "https://doi.org/10.6028/NIST.SP.800-162",
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
      href: "https://zoek.officielebekendmakingen.nl/stcrt-2026-7416-n1.html",
      title: "Circulaire Baseline Informatiebeveiliging Overheid 2",
      date: "5 maart 2026"
    }
  },
});
