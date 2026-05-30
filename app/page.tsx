import Link from "next/link";
import { Button } from "@/components/ui/button";
import { UserCircle, Shield, Home } from "lucide-react";

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <div className="flex-1 overflow-auto p-8">
        <div className="max-w-5xl mx-auto space-y-8">
          {/* Header */}
          <div className="bg-white rounded-lg p-8 shadow-sm border">
            <div className="space-y-2">
              <h1 className="text-4xl font-bold text-gray-900">
                Real Estate CRM Suite (RE-CRM)
              </h1>
              <div className="flex gap-6 text-sm text-gray-600">
                <span>
                  <strong>Version:</strong> 1.0
                </span>
                <span>
                  <strong>Date:</strong> December 13, 2025
                </span>
              </div>
            </div>
          </div>

          {/* Dashboard Access */}
          <div className="bg-white rounded-lg p-6 shadow-sm border">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Quick Access
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Button asChild size="lg" className="h-20">
                <Link href="/admin">
                  <UserCircle className="w-6 h-6 mr-3" />
                  <div className="text-left">
                    <div className="font-semibold">Admin Dashboard</div>
                    <div className="text-xs opacity-90">
                      Manage leads, properties & deals
                    </div>
                  </div>
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="h-20">
                <Link href="/operator">
                  <Shield className="w-6 h-6 mr-3" />
                  <div className="text-left">
                    <div className="font-semibold">Operator Dashboard</div>
                    <div className="text-xs opacity-90">
                      User management & analytics
                    </div>
                  </div>
                </Link>
              </Button>
              <Button asChild size="lg" variant="secondary" className="h-20">
                <Link href="/properties">
                  <Home className="w-6 h-6 mr-3" />
                  <div className="text-left">
                    <div className="font-semibold">Client Portal</div>
                    <div className="text-xs opacity-90">
                      Browse properties & listings
                    </div>
                  </div>
                </Link>
              </Button>
            </div>
          </div>

          {/* Problem Statement */}
          <div className="bg-white rounded-lg p-6 shadow-sm border">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Problems We Solve
            </h2>
            <div className="space-y-4">
              {[
                {
                  problem: "Lead Leakage",
                  description:
                    "Inquiries from Zillow or websites are missed or responded to too late, causing the lead to go to a competitor.",
                  solution:
                    "Automated Ingestion: Instant API integration captures leads immediately. Auto-Responders: Instant SMS/Email acknowledgments ensure zero response lag.",
                },
                {
                  problem: "Data Silos",
                  description:
                    "Client data, property details, and contract documents exist in different, unconnected software.",
                  solution:
                    'Centralized Database: A "Single Source of Truth" where the contact profile contains their preferences, communication logs, and signed documents.',
                },
                {
                  problem: "Lack of Accountability",
                  description:
                    "Brokers cannot track if operators are following up on assigned leads.",
                  solution:
                    "Activity Tracking: Admin dashboards show exactly when an operator last contacted a lead, allowing for intervention on stalled deals.",
                },
                {
                  problem: "Manual Inventory Errors",
                  description:
                    "Updating listing prices manually on the website often leads to discrepancies with the MLS.",
                  solution:
                    "MLS Sync: Real-time synchronization ensures listing data on the agency portal always matches the official MLS database.",
                },
                {
                  problem: "Inconsistent Follow-up",
                  description:
                    "Operators forget to reach out to past clients, losing referral business.",
                  solution:
                    'Drip Campaigns: Automated "Set and Forget" marketing sequences keep the operator top-of-mind for years after closing.',
                },
              ].map((item, index) => (
                <div key={index} className="border rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 mb-2">
                    {item.problem}
                  </h3>
                  <p className="text-sm text-gray-600 mb-3">
                    {item.description}
                  </p>
                  <div className="bg-green-50 border border-green-200 rounded p-3">
                    <p className="text-sm text-green-900">
                      <strong className="text-green-700">Solution:</strong>{" "}
                      {item.solution}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* User Classes */}
          <div className="bg-white rounded-lg p-6 shadow-sm border">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              User Classes
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="border rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-2">
                  Broker/Admin
                </h3>
                <p className="text-sm text-gray-600">
                  Technically competent. Needs high-level aggregation of data
                  and control over user permissions.
                </p>
              </div>
              <div className="border rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-2">
                  Operator
                </h3>
                <p className="text-sm text-gray-600">
                  Mobile-first user. Needs quick access to data in the field.
                  Low tolerance for complex UI; requires intuitive workflows.
                </p>
              </div>
              <div className="border rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-2">
                  Transaction Coordinator
                </h3>
                <p className="text-sm text-gray-600">
                  Detail-oriented. Focuses on document compliance and deadlines.
                </p>
              </div>
            </div>
          </div>

          {/* Operating Environment */}
          <div className="bg-white rounded-lg p-6 shadow-sm border">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Operating Environment
            </h2>
            <div className="space-y-3 text-sm text-gray-600">
              <p>
                <strong>Server Side:</strong> Cloud infrastructure (AWS/Azure)
                running Node.js/Python
              </p>
              <p>
                <strong>Client Side:</strong> Modern Web Browsers (Chrome,
                Safari, Edge)
              </p>
              <p>
                <strong>Mobile:</strong> Native or Hybrid apps for iOS (15+) and
                Android (12+)
              </p>
            </div>
          </div>

          {/* Dev Notice */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-center">
            <p className="text-sm text-yellow-800">
              <strong>Development Page:</strong> This is a temporary
              placeholder. The actual landing page will be designed later.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
