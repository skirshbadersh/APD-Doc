"use client";

import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useTranslation } from "@/lib/i18n/context";
import { getMonthNames } from "@/lib/i18n/format";

export function MonthSelector({
  month,
  year,
  onChange,
}: {
  month: number; // 1-indexed
  year: number;
  onChange: (month: number, year: number) => void;
}) {
  const { locale } = useTranslation();
  const monthNames = getMonthNames(locale);

  function prev() {
    if (month === 1) onChange(12, year - 1);
    else onChange(month - 1, year);
  }

  function next() {
    if (month === 12) onChange(1, year + 1);
    else onChange(month + 1, year);
  }

  return (
    <div className="flex items-center gap-3">
      <Button variant="outline" size="icon" onClick={prev}>
        <ChevronLeft className="h-4 w-4" />
      </Button>
      <h2 className="text-xl font-bold min-w-[180px] text-center">
        {monthNames[month - 1]} {year}
      </h2>
      <Button variant="outline" size="icon" onClick={next}>
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
}
