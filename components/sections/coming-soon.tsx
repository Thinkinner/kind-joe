"use client";

import { motion } from "framer-motion";
import { Rocket } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

export function ComingSoon() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="w-full max-w-2xl"
      >
        <Card className="shadow-none bg-card/70 backdrop-blur-xl p-10 rounded-2xl">
          <CardHeader className="flex flex-col items-center gap-6">
            {/* Icon */}
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.5, ease: "easeOut", delay: 0.1 }}
              className="inline-flex h-24 w-24 items-center justify-center rounded-full 
             bg-gradient-to-tr from-red-900/70 via-primary to-blue-700"
            >
              <motion.div
                animate={{ y: [0, -6, 0] }}
                transition={{
                  duration: 1.8,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              >
                <Rocket className="h-12 w-12 text-primary-foreground" />
              </motion.div>
            </motion.div>

            {/* Title */}
            <CardTitle
              className="text-5xl font-bold tracking-tight text-center 
              bg-gradient-to-r from-primary via-foreground to-primary 
              bg-clip-text text-transparent"
            >
              Coming Soon
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-6 text-center">
            <p className="text-lg text-muted-foreground leading-relaxed">
              We&apos;re building something special — designed to elevate your
              experience. Please check back soon for updates.
            </p>

            {/* Subtle status animation */}
            <motion.div
              className="flex items-center justify-center gap-2 text-sm text-muted-foreground/80"
              animate={{ opacity: [0.45, 1, 0.45] }}
              transition={{
                duration: 2.2,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            >
              <span className="inline-flex h-2 w-2 rounded-full bg-primary/80" />
              <span>Preparing your experience…</span>
            </motion.div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
