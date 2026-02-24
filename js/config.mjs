import { loadRespecWithConfiguration } from "https://logius-standaarden.github.io/publicatie/respec/organisation-config.mjs";
import { generateMermaidFigures } from "https://logius-standaarden.github.io/publicatie/respec/plugins/mermaid.mjs";

loadRespecWithConfiguration({
  useLogo: true,
  useLabel: true,
  license: "cc-by",
  specStatus: "WV",
  specType: "ST",
  pubDomain: "dk",
  shortName: "authorization-decision-log",
  publishDate: "2024-05-19",
  publishVersion: "0.0.1",
  prevVersion: [],
  editors:
    [
      // {
      //   name: "Project Federatieve Toegangsverlening",
      //   company: "MinBZK",
      //   companyURL: "https://federatieve-toegangsverlening-digilab-overheid-n-5d4b9badc9bcfa.gitlab.io/",
      // }
    ],
  authors:
    [
      {
        name: "Maikel Hofman",
        company: "VNG Realisatie"
      },
      {
        name: "Guus van der Meer",
        company: "Vecozo"
      },
      {
        name: "Michiel Trimpe",
        company: "VNG Realisatie"
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
      href: "https://www.iso.org/standard/27001.html",
      title: "Information security, cybersecurity and privacy protection — Information security management systems — Requirements",
      date: "2022-10"
    },
    "ISO/IEC 27002:2022": {
      href: "https://www.iso.org/standard/75652.html",
      title: "Information security, cybersecurity and privacy protection — Information security controls",
      date: "2022-02"
    },
    "BIO2": {
      href: "https://www.bio-overheid.nl/media/cs5ctudu/20250924-baseline-informatiebeveiliging-overheid-2-bio2-v12-def.pdf?csf=1&web=1&e=9JoWOT",
      title: "Baseline Informatiebeveiliging Overheid 2",
      date: "24 september 2025"
    }
  },
});
