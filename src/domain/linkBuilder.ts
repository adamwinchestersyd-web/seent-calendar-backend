type ZohoEnv = "us" | "eu" | "au" | "in";

type Cfg = {
  orgId: string;          // e.g. "640578001"
  env?: ZohoEnv;          // default "au" for you
};

const CRM_HOSTS: Record<ZohoEnv, string> = {
  us: "crm.zoho.com",
  eu: "crm.zoho.eu",
  au: "crm.zoho.com.au",
  in: "crm.zoho.in",
};

export function makeLinkBuilder(cfg: Cfg) {
  const host = CRM_HOSTS[cfg.env ?? "au"];
  const base = `https://${host}/crm/org${cfg.orgId}`;
  return {
    caseUrl: (caseId: string) => `${base}/tab/Cases/${caseId}`,
    contactUrl: (contactId: string) => `${base}/tab/Contacts/${contactId}`,
    accountUrl: (accountId: string) => `${base}/tab/Accounts/${accountId}`,
  };
}
