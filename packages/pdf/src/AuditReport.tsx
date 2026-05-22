import React from "react";
import { Document, Page, Text, View, StyleSheet, Font } from "@react-pdf/renderer";

// Register Helvetica as Satoshi for rendering safety
Font.register({
  family: "Satoshi",
  fonts: [
    {
      src: "https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfMZg.ttf",
    }, // fallback load standard font
  ],
});

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: "Helvetica",
    fontSize: 9,
    color: "#1F2937",
    lineHeight: 1.4,
  },
  // Cover Page Styles
  coverPage: {
    padding: 60,
    fontFamily: "Helvetica",
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
    height: "100%",
  },
  headerRow: {
    display: "flex",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 2,
    borderBottomColor: "#D97706",
    paddingBottom: 15,
  },
  logoText: {
    fontFamily: "Helvetica-Bold",
    fontSize: 18,
    color: "#D97706",
    letterSpacing: 1,
  },
  docTitle: {
    fontFamily: "Helvetica-Bold",
    fontSize: 10,
    color: "#4B5563",
    textTransform: "uppercase",
  },
  coverBody: {
    marginTop: 80,
    marginBottom: 80,
  },
  coverSubTitle: {
    fontSize: 12,
    color: "#D97706",
    fontFamily: "Helvetica-Bold",
    textTransform: "uppercase",
    marginBottom: 10,
  },
  coverMainTitle: {
    fontSize: 28,
    fontFamily: "Helvetica-Bold",
    color: "#111827",
    marginBottom: 20,
    lineHeight: 1.2,
  },
  coverMetaBlock: {
    marginTop: 40,
    borderLeftWidth: 3,
    borderLeftColor: "#D97706",
    paddingLeft: 15,
  },
  metaLabel: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: "#6B7280",
    textTransform: "uppercase",
    marginBottom: 4,
  },
  metaValue: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    color: "#111827",
    marginBottom: 12,
  },
  coverFooter: {
    fontSize: 8,
    color: "#9CA3AF",
    textAlign: "center",
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    paddingTop: 15,
  },
  // Section Styles
  sectionTitle: {
    fontFamily: "Helvetica-Bold",
    fontSize: 12,
    color: "#D97706",
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
    paddingBottom: 5,
    marginTop: 20,
    marginBottom: 10,
    textTransform: "uppercase",
  },
  table: {
    display: "flex",
    flexDirection: "column",
    width: "auto",
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#F9FAFB",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
    padding: 6,
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
    padding: 6,
  },
  tableHeaderCell: {
    fontFamily: "Helvetica-Bold",
    fontSize: 8,
    color: "#374151",
  },
  tableCell: {
    fontSize: 8,
    color: "#4B5563",
  },
  badgeValid: {
    color: "#059669",
    fontFamily: "Helvetica-Bold",
  },
  badgeInvalid: {
    color: "#DC2626",
    fontFamily: "Helvetica-Bold",
  },
  badgePending: {
    color: "#D97706",
    fontFamily: "Helvetica-Bold",
  },
  instructionText: {
    fontSize: 8,
    color: "#4B5563",
    backgroundColor: "#F9FAFB",
    padding: 10,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    fontFamily: "Courier",
    lineHeight: 1.4,
  },
  pageFooter: {
    position: "absolute",
    bottom: 25,
    left: 40,
    right: 40,
    fontSize: 7,
    color: "#9CA3AF",
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    paddingTop: 8,
    display: "flex",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  footerRight: {
    textAlign: "right",
  },
});

interface AuditReportProps {
  tender: {
    id: string;
    title: string;
    revealTime: string | Date;
    merkleRoot?: string | null;
  };
  org: {
    name: string;
  };
  bids: Array<{
    vendorHash: string;
    commitment: string;
    revealedAt?: string | Date | null;
    plaintextBid?: any;
    isValid?: boolean | null;
  }>;
  auditLogs: Array<{
    createdAt: string | Date;
    eventType: string;
    actorId?: string | null;
    eventHash: string;
    prevHash: string;
  }>;
  pdfHash?: string;
}

export const AuditReport: React.FC<AuditReportProps> = ({
  tender,
  org,
  bids,
  auditLogs,
  pdfHash = "PENDING_SHA256",
}) => {
  const formatTime = (time: string | Date) => {
    return new Date(time).toISOString();
  };

  const verifyUrl = `https://sealedbid.app/verify/${tender.id}`;

  return (
    <Document>
      {/* PAGE 1: COVER PAGE */}
      <Page size="A4" style={styles.coverPage}>
        <View style={styles.headerRow}>
          <Text style={styles.logoText}>SEALEDBID</Text>
          <Text style={styles.docTitle}>Cryptographic Audit Report</Text>
        </View>

        <View style={styles.coverBody}>
          <Text style={styles.coverSubTitle}>Tender Audit Summary</Text>
          <Text style={styles.coverMainTitle}>{tender.title}</Text>

          <View style={styles.coverMetaBlock}>
            <Text style={styles.metaLabel}>Tender ID</Text>
            <Text style={styles.metaValue}>{tender.id}</Text>

            <Text style={styles.metaLabel}>Issuing Organization</Text>
            <Text style={styles.metaValue}>{org.name}</Text>

            <Text style={styles.metaLabel}>Reveal Timestamp</Text>
            <Text style={styles.metaValue}>{formatTime(tender.revealTime)}</Text>

            <Text style={styles.metaLabel}>Merkle Root</Text>
            <Text style={styles.metaValue}>{tender.merkleRoot || "N/A"}</Text>
          </View>
        </View>

        <View style={styles.coverFooter}>
          <Text>Confidential cryptographic audit report generated strictly for {org.name}.</Text>
          <Text style={{ marginTop: 4 }}>
            Verify at {verifyUrl} | SHA256: {pdfHash}
          </Text>
        </View>
      </Page>

      {/* PAGE 2: BID SUMMARY TABLE */}
      <Page size="A4" style={styles.page}>
        <Text style={styles.sectionTitle}>Cryptographic Bid Commitments</Text>

        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <View style={{ width: "25%" }}>
              <Text style={styles.tableHeaderCell}>Vendor Hash</Text>
            </View>
            <View style={{ width: "45%" }}>
              <Text style={styles.tableHeaderCell}>Commitment</Text>
            </View>
            <View style={{ width: "15%" }}>
              <Text style={styles.tableHeaderCell}>Value</Text>
            </View>
            <View style={{ width: "15%" }}>
              <Text style={styles.tableHeaderCell}>Status</Text>
            </View>
          </View>

          {bids.map((bid, i) => {
            let statusText = "PENDING";
            let statusStyle = styles.badgePending;
            if (bid.isValid === true) {
              statusText = "VALIDATED";
              statusStyle = styles.badgeValid;
            } else if (bid.isValid === false) {
              statusText = "DISPUTED";
              statusStyle = styles.badgeInvalid;
            }

            let bidPrice = "SEALED";
            if (bid.plaintextBid) {
              const parsed =
                typeof bid.plaintextBid === "string"
                  ? JSON.parse(bid.plaintextBid)
                  : bid.plaintextBid;
              bidPrice =
                parsed.price !== undefined
                  ? `$${parsed.price}`
                  : parsed.unitPrice !== undefined
                    ? `$${parsed.unitPrice * (parsed.qty || 1)}`
                    : "REVEALED";
            }

            return (
              <View key={i} style={styles.tableRow}>
                <View style={{ width: "25%" }}>
                  <Text style={styles.tableCell}>{bid.vendorHash.slice(0, 12)}...</Text>
                </View>
                <View style={{ width: "45%" }}>
                  <Text style={styles.tableCell}>{bid.commitment.slice(0, 24)}...</Text>
                </View>
                <View style={{ width: "15%" }}>
                  <Text style={styles.tableCell}>{bidPrice}</Text>
                </View>
                <View style={{ width: "15%" }}>
                  <Text style={[styles.tableCell, statusStyle]}>{statusText}</Text>
                </View>
              </View>
            );
          })}
        </View>

        <Text style={styles.sectionTitle}>Client Verification Instructions</Text>
        <View style={styles.instructionText}>
          <Text>
            To audit this tender locally and verify proof integrity with zero-trust in the server:
          </Text>
          <Text style={{ marginTop: 4 }}>
            1. Install the CLI client: npm install -g @sealedbid/cli
          </Text>
          <Text>2. Run verification tool: sealedbid-verify {tender.id}</Text>
          <Text>3. Verify the computed Merkle Root matches: {tender.merkleRoot || "N/A"}</Text>
        </View>

        <View style={styles.pageFooter}>
          <Text>
            Verify at {verifyUrl} | SHA256: {pdfHash}
          </Text>
          <Text style={styles.footerRight}>Page 2</Text>
        </View>
      </Page>

      {/* PAGE 3+: AUDIT TRAIL TABLE */}
      <Page size="A4" style={styles.page}>
        <Text style={styles.sectionTitle}>Cryptographic Audit Trail Ledger</Text>

        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <View style={{ width: "25%" }}>
              <Text style={styles.tableHeaderCell}>Timestamp</Text>
            </View>
            <View style={{ width: "25%" }}>
              <Text style={styles.tableHeaderCell}>Event Type</Text>
            </View>
            <View style={{ width: "25%" }}>
              <Text style={styles.tableHeaderCell}>Event Hash</Text>
            </View>
            <View style={{ width: "25%" }}>
              <Text style={styles.tableHeaderCell}>Previous Hash</Text>
            </View>
          </View>

          {auditLogs.map((log, i) => (
            <View key={i} style={styles.tableRow}>
              <View style={{ width: "25%" }}>
                <Text style={styles.tableCell}>{formatTime(log.createdAt)}</Text>
              </View>
              <View style={{ width: "25%" }}>
                <Text style={styles.tableCell}>{log.eventType}</Text>
              </View>
              <View style={{ width: "25%" }}>
                <Text style={styles.tableCell}>{log.eventHash.slice(0, 16)}...</Text>
              </View>
              <View style={{ width: "25%" }}>
                <Text style={styles.tableCell}>{log.prevHash.slice(0, 16)}...</Text>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.pageFooter}>
          <Text>
            Verify at {verifyUrl} | SHA256: {pdfHash}
          </Text>
          <Text style={styles.footerRight}>Page 3</Text>
        </View>
      </Page>
    </Document>
  );
};
