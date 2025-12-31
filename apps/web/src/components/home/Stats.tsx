"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { FileText, PenTool, ShieldCheck } from "lucide-react";

interface Stats {
  contracts: number;
  analyzed: number;
  signatures: number;
}

export function Stats() {
  const [stats, setStats] = useState<Stats>({ contracts: 0, analyzed: 0, signatures: 0 });
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetch("/api/stats")
      .then((res) => res.json())
      .then((data) => {
        setStats(data);
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, []);

  const statItems = [
    {
      name: "Contracts Created",
      value: stats.contracts,
      icon: FileText,
      color: "text-[#529ec6]",
      bgColor: "bg-[#529ec6]/10",
    },
    {
      name: "Signatures Sent",
      value: stats.signatures,
      icon: PenTool,
      color: "text-emerald-600",
      bgColor: "bg-emerald-50",
    },
    {
      name: "Risk Analyses",
      value: stats.analyzed,
      icon: ShieldCheck,
      color: "text-violet-600",
      bgColor: "bg-violet-50",
    },
  ];

  return (
    <section className="py-16 bg-gradient-to-b from-slate-50 to-white">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-10"
        >
          <h2 className="text-2xl font-semibold text-slate-900">
            Trusted by founders & freelancers
          </h2>
          <p className="text-slate-500 mt-2">
            Real-time platform activity
          </p>
        </motion.div>

        <div className="grid grid-cols-3 gap-6">
          {statItems.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <motion.div
                key={stat.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="text-center"
              >
                <div className={`inline-flex items-center justify-center w-12 h-12 rounded-xl ${stat.bgColor} ${stat.color} mb-3`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div className="text-3xl font-bold text-slate-900 tabular-nums">
                  {loaded ? stats.contracts === 0 && stats.signatures === 0 && stats.analyzed === 0 ? "—" : stat.value.toLocaleString() : "—"}
                </div>
                <div className="text-sm text-slate-500 mt-1">
                  {stat.name}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
