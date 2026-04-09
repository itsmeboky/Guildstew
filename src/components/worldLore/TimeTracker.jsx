import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Clock, Calendar, Plus, Minus, Moon, Sun } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export default function TimeTracker({ campaign, compact = false }) {
  const queryClient = useQueryClient();
  const [advanceAmount, setAdvanceAmount] = useState(1);

  const calendar = campaign?.calendar_system || {
    hours_per_day: 24,
    days_per_week: 7,
    weeks_per_month: 4,
    months_per_year: 12,
    day_names: [],
    month_names: [],
    current_date: { year: 1, month: 1, day: 1, hour: 0 }
  };

  const celestialBodies = campaign?.celestial_bodies || [];
  const seasons = campaign?.seasons || [];
  const events = campaign?.calendar_events || [];

  const updateTimeMutation = useMutation({
    mutationFn: (newDate) => base44.entities.Campaign.update(campaign.id, {
      calendar_system: { ...calendar, current_date: newDate }
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaign', campaign.id] });
      toast.success("Time updated");
    }
  });

  const advanceTime = (unit) => {
    const current = calendar.current_date;
    let newDate = { ...current };

    switch(unit) {
      case 'hour':
        newDate.hour += advanceAmount;
        while (newDate.hour >= calendar.hours_per_day) {
          newDate.hour -= calendar.hours_per_day;
          newDate.day += 1;
        }
        break;
      case 'day':
        newDate.day += advanceAmount;
        break;
      case 'week':
        newDate.day += advanceAmount * calendar.days_per_week;
        break;
      case 'month':
        newDate.month += advanceAmount;
        break;
    }

    // Handle day overflow
    const daysInMonth = calendar.days_per_week * calendar.weeks_per_month;
    while (newDate.day > daysInMonth) {
      newDate.day -= daysInMonth;
      newDate.month += 1;
    }

    // Handle month overflow
    while (newDate.month > calendar.months_per_year) {
      newDate.month -= calendar.months_per_year;
      newDate.year += 1;
    }

    updateTimeMutation.mutate(newDate);
  };

  const monthName = calendar.month_names?.[calendar.current_date.month - 1] || `Month ${calendar.current_date.month}`;
  const dayName = calendar.day_names?.[
    (calendar.current_date.day - 1) % calendar.days_per_week
  ] || `Day ${(calendar.current_date.day - 1) % calendar.days_per_week + 1}`;

  const currentSeason = seasons.find(s => {
    const endMonth = s.start_month + s.duration_months - 1;
    return calendar.current_date.month >= s.start_month && calendar.current_date.month <= endMonth;
  });

  const todayEvents = events.filter(e => 
    e.month === calendar.current_date.month && 
    e.day === calendar.current_date.day
  );

  const getCelestialPhase = (body) => {
    if (!body.orbital_period) return 0;
    const totalDays = (calendar.current_date.year - 1) * (calendar.months_per_year * calendar.days_per_week * calendar.weeks_per_month) + 
                      (calendar.current_date.month - 1) * (calendar.days_per_week * calendar.weeks_per_month) + 
                      calendar.current_date.day;
    return (totalDays % body.orbital_period) / body.orbital_period;
  };

  if (compact) {
    return (
      <div className="bg-[#2A3441] rounded-lg p-4 border border-gray-700">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-[#37F2D1]" />
            <span className="font-semibold text-sm">Current Time</span>
          </div>
          <div className="flex gap-1">
            {celestialBodies.map((body, idx) => {
              const phase = getCelestialPhase(body);
              const Icon = body.type === 'sun' ? Sun : Moon;
              return (
                <Icon
                  key={idx}
                  className="w-4 h-4"
                  style={{ 
                    color: body.color,
                    opacity: body.type === 'sun' ? 1 : 0.5 + phase * 0.5
                  }}
                  title={`${body.name}: ${Math.round(phase * 100)}%`}
                />
              );
            })}
          </div>
        </div>

        <div className="text-center mb-3">
          <div className="text-2xl font-bold">
            {dayName}, {monthName} {calendar.current_date.day}
          </div>
          <div className="text-gray-400 text-sm">
            Year {calendar.current_date.year} • Hour {calendar.current_date.hour}
          </div>
          {currentSeason && (
            <div 
              className="inline-block mt-2 px-3 py-1 rounded-full text-xs font-semibold"
              style={{ backgroundColor: currentSeason.color + '20', color: currentSeason.color }}
            >
              {currentSeason.name}
            </div>
          )}
        </div>

        {todayEvents.length > 0 && (
          <div className="bg-[#1E2430] rounded p-2 mb-3">
            <p className="text-xs text-gray-400 mb-1">Today's Events:</p>
            {todayEvents.map((event, idx) => (
              <p key={idx} className="text-xs text-[#37F2D1]">• {event.name}</p>
            ))}
          </div>
        )}

        <div className="flex gap-2">
          <Input
            type="number"
            min="1"
            value={advanceAmount}
            onChange={(e) => setAdvanceAmount(parseInt(e.target.value) || 1)}
            className="w-16 bg-[#1E2430] border-gray-700 text-white text-sm"
          />
          <Button onClick={() => advanceTime('hour')} size="sm" variant="outline" className="flex-1 text-xs">
            +{advanceAmount}h
          </Button>
          <Button onClick={() => advanceTime('day')} size="sm" variant="outline" className="flex-1 text-xs">
            +{advanceAmount}d
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#2A3441] rounded-xl p-6 border border-gray-700">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Clock className="w-6 h-6 text-[#37F2D1]" />
          <h3 className="text-2xl font-bold">Time Tracker</h3>
        </div>
        <div className="flex gap-2">
          {celestialBodies.map((body, idx) => {
            const phase = getCelestialPhase(body);
            const Icon = body.type === 'sun' ? Sun : Moon;
            return (
              <div key={idx} className="flex flex-col items-center">
                <Icon
                  className="w-6 h-6"
                  style={{ 
                    color: body.color,
                    opacity: body.type === 'sun' ? 1 : 0.5 + phase * 0.5
                  }}
                />
                <span className="text-xs text-gray-400">{Math.round(phase * 100)}%</span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="text-center mb-6">
        <div className="text-4xl font-bold mb-2">
          {dayName}, {monthName} {calendar.current_date.day}
        </div>
        <div className="text-xl text-gray-400">
          Year {calendar.current_date.year} • Hour {calendar.current_date.hour} of {calendar.hours_per_day}
        </div>
        {currentSeason && (
          <div 
            className="inline-block mt-3 px-4 py-2 rounded-full font-semibold"
            style={{ backgroundColor: currentSeason.color + '20', color: currentSeason.color }}
          >
            {currentSeason.name}
          </div>
        )}
      </div>

      {todayEvents.length > 0 && (
        <div className="bg-[#1E2430] rounded-lg p-4 mb-6">
          <h4 className="font-semibold mb-2 text-[#37F2D1]">Today's Events</h4>
          {todayEvents.map((event, idx) => (
            <div key={idx} className="mb-2">
              <p className="font-semibold text-white">{event.name}</p>
              {event.description && (
                <p className="text-sm text-gray-400">{event.description}</p>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-400 w-20">Advance by:</span>
          <Input
            type="number"
            min="1"
            value={advanceAmount}
            onChange={(e) => setAdvanceAmount(parseInt(e.target.value) || 1)}
            className="w-20 bg-[#1E2430] border-gray-700 text-white"
          />
        </div>
        
        <div className="grid grid-cols-2 gap-2">
          <Button 
            onClick={() => advanceTime('hour')}
            className="bg-[#37F2D1] hover:bg-[#2dd9bd] text-[#1E2430]"
          >
            <Plus className="w-4 h-4 mr-2" />
            {advanceAmount} Hour{advanceAmount !== 1 ? 's' : ''}
          </Button>
          <Button 
            onClick={() => advanceTime('day')}
            className="bg-[#37F2D1] hover:bg-[#2dd9bd] text-[#1E2430]"
          >
            <Plus className="w-4 h-4 mr-2" />
            {advanceAmount} Day{advanceAmount !== 1 ? 's' : ''}
          </Button>
          <Button 
            onClick={() => advanceTime('week')}
            variant="outline"
            className="border-gray-700 text-white hover:bg-[#1E2430]"
          >
            <Plus className="w-4 h-4 mr-2" />
            {advanceAmount} Week{advanceAmount !== 1 ? 's' : ''}
          </Button>
          <Button 
            onClick={() => advanceTime('month')}
            variant="outline"
            className="border-gray-700 text-white hover:bg-[#1E2430]"
          >
            <Plus className="w-4 h-4 mr-2" />
            {advanceAmount} Month{advanceAmount !== 1 ? 's' : ''}
          </Button>
        </div>
      </div>
    </div>
  );
}