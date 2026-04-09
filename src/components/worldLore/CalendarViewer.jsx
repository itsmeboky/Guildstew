import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Sun, Moon, Sparkles } from "lucide-react";

export default function CalendarViewer({ campaign, entries = [] }) {
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

  const [currentMonth, setCurrentMonth] = useState(calendar.current_date?.month || 1);
  const [currentYear, setCurrentYear] = useState(calendar.current_date?.year || 1);

  const daysInMonth = calendar.days_per_week * calendar.weeks_per_month;
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  const monthName = calendar.month_names?.[currentMonth - 1] || `Month ${currentMonth}`;
  
  const currentSeason = seasons.find(s => {
    const endMonth = s.start_month + s.duration_months - 1;
    return currentMonth >= s.start_month && currentMonth <= endMonth;
  });

  const currentEpoch = campaign?.epochs?.find(e => 
    currentYear >= e.start_year && currentYear <= e.end_year
  );

  // Get events from both calendar_events and lore entries with event_date
  const loreEvents = entries
    .filter(entry => entry.event_date && entry.event_date.month === currentMonth)
    .map(entry => ({
      name: entry.title,
      description: entry.content ? entry.content.replace(/<[^>]*>/g, '').substring(0, 100) : '',
      day: entry.event_date.day,
      month: entry.event_date.month,
      recurring: entry.event_date.recurring
    }));
  
  const monthEvents = [...events.filter(e => e.month === currentMonth), ...loreEvents];

  const getCelestialPosition = (body) => {
    if (!body.orbital_period) return 0;
    const totalDays = (currentYear - 1) * (calendar.months_per_year * daysInMonth) + 
                      (currentMonth - 1) * daysInMonth + 
                      (calendar.current_date?.day || 1);
    return (totalDays % body.orbital_period) / body.orbital_period;
  };

  return (
    <div className="space-y-6">
      {/* Sky View */}
      <div className="bg-gradient-to-b from-blue-900 to-blue-950 rounded-xl p-8 border border-gray-700 relative overflow-hidden">
        <div className="absolute inset-0 opacity-30">
          {Array.from({ length: 50 }).map((_, i) => (
            <div
              key={i}
              className="absolute w-1 h-1 bg-white rounded-full"
              style={{
                top: `${Math.random() * 100}%`,
                left: `${Math.random() * 100}%`,
                opacity: Math.random() * 0.7 + 0.3
              }}
            />
          ))}
        </div>
        
        <div className="relative z-10">
          <h3 className="text-xl font-bold mb-4 text-white">Celestial View</h3>
          <div className="flex items-center justify-center gap-8 min-h-32">
            {celestialBodies.map((body, idx) => {
              const position = getCelestialPosition(body);
              const Icon = body.type === 'sun' ? Sun : Moon;
              return (
                <div
                  key={idx}
                  className="flex flex-col items-center gap-2"
                  style={{
                    transform: `translateY(${Math.sin(position * Math.PI * 2) * 20}px)`
                  }}
                >
                  <Icon
                    className="w-12 h-12"
                    style={{ color: body.color }}
                  />
                  <div className="text-center">
                    <p className="text-white font-semibold text-sm">{body.name}</p>
                    <p className="text-gray-400 text-xs">{Math.round(position * 100)}% orbit</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Current Time */}
      <div className="bg-[#2A3441] rounded-xl p-6 border border-gray-700 text-center">
        <div className="text-4xl font-bold mb-2">
          {monthName} {calendar.current_date?.day || 1}, Year {currentYear}
        </div>
        <div className="text-xl text-gray-400">
          Hour {calendar.current_date?.hour || 0} of {calendar.hours_per_day}
        </div>
        {currentSeason && (
          <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-full" style={{ backgroundColor: currentSeason.color + '20', color: currentSeason.color }}>
            <Sparkles className="w-4 h-4" />
            {currentSeason.name}
          </div>
        )}
        {currentEpoch && (
          <div className="mt-2 text-sm text-gray-400">
            Epoch: {currentEpoch.name}
          </div>
        )}
      </div>

      {/* Calendar Grid */}
      <div className="bg-[#2A3441] rounded-xl p-6 border border-gray-700">
        <div className="flex items-center justify-between mb-6">
          <Button
            onClick={() => {
              if (currentMonth === 1) {
                setCurrentMonth(calendar.months_per_year);
                setCurrentYear(currentYear - 1);
              } else {
                setCurrentMonth(currentMonth - 1);
              }
            }}
            variant="ghost"
            size="sm"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          
          <h3 className="text-2xl font-bold">{monthName} {currentYear}</h3>
          
          <Button
            onClick={() => {
              if (currentMonth === calendar.months_per_year) {
                setCurrentMonth(1);
                setCurrentYear(currentYear + 1);
              } else {
                setCurrentMonth(currentMonth + 1);
              }
            }}
            variant="ghost"
            size="sm"
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>

        {/* Day names */}
        {calendar.day_names?.length > 0 && (
          <div className="grid gap-2 mb-2" style={{ gridTemplateColumns: `repeat(${calendar.days_per_week}, 1fr)` }}>
            {calendar.day_names.map((name, idx) => (
              <div key={idx} className="text-center font-semibold text-sm text-gray-400 p-2">
                {name}
              </div>
            ))}
          </div>
        )}

        {/* Days grid */}
        <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${calendar.days_per_week}, 1fr)` }}>
          {days.map(day => {
            const dayEvents = monthEvents.filter(e => e.day === day);
            const isToday = day === calendar.current_date?.day && currentMonth === calendar.current_date?.month;
            
            return (
              <div
                key={day}
                className={`aspect-square rounded-lg border p-2 flex flex-col ${
                  isToday 
                    ? 'bg-[#37F2D1] border-[#37F2D1] text-[#1E2430]' 
                    : 'bg-[#1E2430] border-gray-700 text-white hover:border-gray-600'
                }`}
              >
                <div className="font-semibold text-sm">{day}</div>
                {dayEvents.length > 0 && (
                  <div className="flex-1 flex flex-col justify-end">
                    {dayEvents.map((event, idx) => (
                      <div
                        key={idx}
                        className={`text-xs px-1 py-0.5 rounded mt-1 truncate ${
                          isToday ? 'bg-[#1E2430] text-white' : 'bg-[#37F2D1] text-[#1E2430]'
                        }`}
                        title={event.name}
                      >
                        {event.name}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Upcoming Events */}
      {monthEvents.length > 0 && (
        <div className="bg-[#2A3441] rounded-xl p-6 border border-gray-700">
          <h3 className="text-xl font-bold mb-4">Events This Month</h3>
          <div className="space-y-3">
            {monthEvents.map((event, idx) => (
              <div key={idx} className="bg-[#1E2430] rounded-lg p-4">
                <div className="flex items-start justify-between mb-2">
                  <h4 className="font-bold">{event.name}</h4>
                  <span className="text-sm text-gray-400">Day {event.day}</span>
                </div>
                {event.description && (
                  <p className="text-sm text-gray-400">{event.description}</p>
                )}
                {event.celestial_trigger && (
                  <p className="text-xs text-[#37F2D1] mt-2">
                    Triggered by: {event.celestial_trigger}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}