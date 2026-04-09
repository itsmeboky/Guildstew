import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Sun, Moon, Calendar as CalendarIcon, Clock, Sparkles } from "lucide-react";
import { toast } from "sonner";

export default function CalendarBuilder({ campaign, onUpdate }) {
  const [calendarSystem, setCalendarSystem] = useState(campaign?.calendar_system || {
    hours_per_day: 24,
    days_per_week: 7,
    weeks_per_month: 4,
    months_per_year: 12,
    day_names: [],
    month_names: [],
    year_name: "Year",
    current_date: { year: 1, month: 1, day: 1, hour: 0 }
  });

  const [celestialBodies, setCelestialBodies] = useState(campaign?.celestial_bodies || []);
  const [seasons, setSeasons] = useState(campaign?.seasons || []);
  const [epochs, setEpochs] = useState(campaign?.epochs || []);
  const [events, setEvents] = useState(campaign?.calendar_events || []);

  const handleSave = () => {
    onUpdate({
      calendar_system: calendarSystem,
      celestial_bodies: celestialBodies,
      seasons: seasons,
      epochs: epochs,
      calendar_events: events
    });
    toast.success("Calendar system saved");
  };

  const addCelestialBody = () => {
    setCelestialBodies([...celestialBodies, {
      name: "",
      type: "moon",
      orbital_period: 30,
      color: "#ffffff",
      size: "medium",
      description: ""
    }]);
  };

  const addSeason = () => {
    setSeasons([...seasons, {
      name: "",
      start_month: 1,
      duration_months: 3,
      description: "",
      color: "#4ade80"
    }]);
  };

  const addEpoch = () => {
    setEpochs([...epochs, {
      name: "",
      start_year: 0,
      end_year: 100,
      description: ""
    }]);
  };

  const addEvent = () => {
    setEvents([...events, {
      name: "",
      description: "",
      month: 1,
      day: 1,
      recurring: true,
      celestial_trigger: ""
    }]);
  };

  return (
    <div className="space-y-8">
      {/* Time Units */}
      <div className="bg-[#2A3441] rounded-xl p-6 border border-gray-700">
        <div className="flex items-center gap-2 mb-4">
          <Clock className="w-5 h-5 text-[#37F2D1]" />
          <h3 className="text-xl font-bold">Time Units</h3>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Hours per Day</Label>
            <Input
              type="number"
              value={calendarSystem.hours_per_day}
              onChange={(e) => setCalendarSystem({...calendarSystem, hours_per_day: parseInt(e.target.value)})}
              className="bg-[#1E2430] border-gray-700 text-white"
            />
          </div>
          <div>
            <Label>Days per Week</Label>
            <Input
              type="number"
              value={calendarSystem.days_per_week}
              onChange={(e) => setCalendarSystem({...calendarSystem, days_per_week: parseInt(e.target.value)})}
              className="bg-[#1E2430] border-gray-700 text-white"
            />
          </div>
          <div>
            <Label>Weeks per Month</Label>
            <Input
              type="number"
              value={calendarSystem.weeks_per_month}
              onChange={(e) => setCalendarSystem({...calendarSystem, weeks_per_month: parseInt(e.target.value)})}
              className="bg-[#1E2430] border-gray-700 text-white"
            />
          </div>
          <div>
            <Label>Months per Year</Label>
            <Input
              type="number"
              value={calendarSystem.months_per_year}
              onChange={(e) => setCalendarSystem({...calendarSystem, months_per_year: parseInt(e.target.value)})}
              className="bg-[#1E2430] border-gray-700 text-white"
            />
          </div>
        </div>
      </div>

      {/* Day & Month Names */}
      <div className="bg-[#2A3441] rounded-xl p-6 border border-gray-700">
        <div className="flex items-center gap-2 mb-4">
          <CalendarIcon className="w-5 h-5 text-[#37F2D1]" />
          <h3 className="text-xl font-bold">Names</h3>
        </div>
        <div className="space-y-4">
          <div>
            <Label>Day Names (comma-separated)</Label>
            <Input
              placeholder="e.g., Monday, Tuesday, Wednesday..."
              value={calendarSystem.day_names?.join(", ") || ""}
              onChange={(e) => setCalendarSystem({...calendarSystem, day_names: e.target.value.split(",").map(s => s.trim())})}
              className="bg-[#1E2430] border-gray-700 text-white"
            />
          </div>
          <div>
            <Label>Month Names (comma-separated)</Label>
            <Input
              placeholder="e.g., Spring's Dawn, Summer's Peak..."
              value={calendarSystem.month_names?.join(", ") || ""}
              onChange={(e) => setCalendarSystem({...calendarSystem, month_names: e.target.value.split(",").map(s => s.trim())})}
              className="bg-[#1E2430] border-gray-700 text-white"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Dawn Hour (day begins)</Label>
              <Input
                type="number"
                min="0"
                max={calendarSystem.hours_per_day - 1}
                value={calendarSystem.dawn_hour || 6}
                onChange={(e) => setCalendarSystem({...calendarSystem, dawn_hour: parseInt(e.target.value)})}
                className="bg-[#1E2430] border-gray-700 text-white"
              />
            </div>
            <div>
              <Label>Dusk Hour (night begins)</Label>
              <Input
                type="number"
                min="0"
                max={calendarSystem.hours_per_day - 1}
                value={calendarSystem.dusk_hour || 18}
                onChange={(e) => setCalendarSystem({...calendarSystem, dusk_hour: parseInt(e.target.value)})}
                className="bg-[#1E2430] border-gray-700 text-white"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Celestial Bodies */}
      <div className="bg-[#2A3441] rounded-xl p-6 border border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Sun className="w-5 h-5 text-[#FF5722]" />
            <h3 className="text-xl font-bold">Celestial Bodies</h3>
          </div>
          <Button onClick={addCelestialBody} size="sm" className="bg-[#37F2D1] hover:bg-[#2dd9bd] text-[#1E2430]">
            <Plus className="w-4 h-4 mr-2" />
            Add Body
          </Button>
        </div>
        <div className="space-y-4">
          {celestialBodies.map((body, idx) => (
            <div key={idx} className="bg-[#1E2430] rounded-lg p-4 space-y-3">
              <div className="flex items-start justify-between">
                <div className="flex-1 grid grid-cols-2 gap-3">
                  <Input
                    placeholder="Name (e.g., Luna)"
                    value={body.name}
                    onChange={(e) => {
                      const updated = [...celestialBodies];
                      updated[idx].name = e.target.value;
                      setCelestialBodies(updated);
                    }}
                    className="bg-[#2A3441] border-gray-700 text-white"
                  />
                  <Select
                    value={body.type}
                    onValueChange={(value) => {
                      const updated = [...celestialBodies];
                      updated[idx].type = value;
                      setCelestialBodies(updated);
                    }}
                  >
                    <SelectTrigger className="bg-[#2A3441] border-gray-700 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sun">Sun</SelectItem>
                      <SelectItem value="moon">Moon</SelectItem>
                      <SelectItem value="planet">Planet</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                  <div>
                    <Label className="text-xs">Orbital Period (days)</Label>
                    <Input
                      type="number"
                      value={body.orbital_period}
                      onChange={(e) => {
                        const updated = [...celestialBodies];
                        updated[idx].orbital_period = parseInt(e.target.value);
                        setCelestialBodies(updated);
                      }}
                      className="bg-[#2A3441] border-gray-700 text-white"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Color</Label>
                    <input
                      type="color"
                      value={body.color}
                      onChange={(e) => {
                        const updated = [...celestialBodies];
                        updated[idx].color = e.target.value;
                        setCelestialBodies(updated);
                      }}
                      className="w-full h-9 bg-[#2A3441] border border-gray-700 rounded-md cursor-pointer"
                    />
                  </div>
                  <Textarea
                    placeholder="Description..."
                    value={body.description}
                    onChange={(e) => {
                      const updated = [...celestialBodies];
                      updated[idx].description = e.target.value;
                      setCelestialBodies(updated);
                    }}
                    className="bg-[#2A3441] border-gray-700 text-white col-span-2"
                    rows={2}
                  />
                </div>
                <Button
                  onClick={() => setCelestialBodies(celestialBodies.filter((_, i) => i !== idx))}
                  variant="ghost"
                  size="sm"
                  className="text-red-400 hover:text-red-300 ml-2"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Seasons */}
      <div className="bg-[#2A3441] rounded-xl p-6 border border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-[#37F2D1]" />
            <h3 className="text-xl font-bold">Seasons & Epochs</h3>
          </div>
          <div className="flex gap-2">
            <Button onClick={addSeason} size="sm" className="bg-[#37F2D1] hover:bg-[#2dd9bd] text-[#1E2430]">
              <Plus className="w-4 h-4 mr-2" />
              Season
            </Button>
            <Button onClick={addEpoch} size="sm" className="bg-[#FF5722] hover:bg-[#FF6B3D] text-white">
              <Plus className="w-4 h-4 mr-2" />
              Epoch
            </Button>
          </div>
        </div>
        
        <div className="space-y-4">
          <div>
            <h4 className="text-sm font-semibold mb-2 text-gray-400">SEASONS</h4>
            {seasons.map((season, idx) => (
              <div key={idx} className="bg-[#1E2430] rounded-lg p-4 mb-2">
                <div className="flex items-start gap-3">
                  <div className="flex-1 grid grid-cols-2 gap-3">
                    <Input
                      placeholder="Season name"
                      value={season.name}
                      onChange={(e) => {
                        const updated = [...seasons];
                        updated[idx].name = e.target.value;
                        setSeasons(updated);
                      }}
                      className="bg-[#2A3441] border-gray-700 text-white"
                    />
                    <div className="flex gap-2">
                      <div className="flex-1">
                        <Label className="text-xs">Start Month</Label>
                        <Input
                          type="number"
                          min="1"
                          value={season.start_month}
                          onChange={(e) => {
                            const updated = [...seasons];
                            updated[idx].start_month = parseInt(e.target.value);
                            setSeasons(updated);
                          }}
                          className="bg-[#2A3441] border-gray-700 text-white"
                        />
                      </div>
                      <div className="flex-1">
                        <Label className="text-xs">Duration (months)</Label>
                        <Input
                          type="number"
                          min="1"
                          value={season.duration_months}
                          onChange={(e) => {
                            const updated = [...seasons];
                            updated[idx].duration_months = parseInt(e.target.value);
                            setSeasons(updated);
                          }}
                          className="bg-[#2A3441] border-gray-700 text-white"
                        />
                      </div>
                    </div>
                    <Textarea
                      placeholder="Description..."
                      value={season.description}
                      onChange={(e) => {
                        const updated = [...seasons];
                        updated[idx].description = e.target.value;
                        setSeasons(updated);
                      }}
                      className="bg-[#2A3441] border-gray-700 text-white col-span-2"
                      rows={2}
                    />
                  </div>
                  <Button
                    onClick={() => setSeasons(seasons.filter((_, i) => i !== idx))}
                    variant="ghost"
                    size="sm"
                    className="text-red-400 hover:text-red-300"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>

          <div>
            <h4 className="text-sm font-semibold mb-2 text-gray-400">EPOCHS</h4>
            {epochs.map((epoch, idx) => (
              <div key={idx} className="bg-[#1E2430] rounded-lg p-4 mb-2">
                <div className="flex items-start gap-3">
                  <div className="flex-1 space-y-3">
                    <Input
                      placeholder="Epoch name"
                      value={epoch.name}
                      onChange={(e) => {
                        const updated = [...epochs];
                        updated[idx].name = e.target.value;
                        setEpochs(updated);
                      }}
                      className="bg-[#2A3441] border-gray-700 text-white"
                    />
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs">Start Year</Label>
                        <Input
                          type="number"
                          value={epoch.start_year}
                          onChange={(e) => {
                            const updated = [...epochs];
                            updated[idx].start_year = parseInt(e.target.value);
                            setEpochs(updated);
                          }}
                          className="bg-[#2A3441] border-gray-700 text-white"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">End Year</Label>
                        <Input
                          type="number"
                          value={epoch.end_year}
                          onChange={(e) => {
                            const updated = [...epochs];
                            updated[idx].end_year = parseInt(e.target.value);
                            setEpochs(updated);
                          }}
                          className="bg-[#2A3441] border-gray-700 text-white"
                        />
                      </div>
                    </div>
                    <Textarea
                      placeholder="Description..."
                      value={epoch.description}
                      onChange={(e) => {
                        const updated = [...epochs];
                        updated[idx].description = e.target.value;
                        setEpochs(updated);
                      }}
                      className="bg-[#2A3441] border-gray-700 text-white"
                      rows={2}
                    />
                  </div>
                  <Button
                    onClick={() => setEpochs(epochs.filter((_, i) => i !== idx))}
                    variant="ghost"
                    size="sm"
                    className="text-red-400 hover:text-red-300"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Events */}
      <div className="bg-[#2A3441] rounded-xl p-6 border border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <CalendarIcon className="w-5 h-5 text-[#37F2D1]" />
            <h3 className="text-xl font-bold">Calendar Events</h3>
          </div>
          <Button onClick={addEvent} size="sm" className="bg-[#37F2D1] hover:bg-[#2dd9bd] text-[#1E2430]">
            <Plus className="w-4 h-4 mr-2" />
            Add Event
          </Button>
        </div>
        <div className="space-y-4">
          {events.map((event, idx) => (
            <div key={idx} className="bg-[#1E2430] rounded-lg p-4">
              <div className="flex items-start gap-3">
                <div className="flex-1 space-y-3">
                  <Input
                    placeholder="Event name"
                    value={event.name}
                    onChange={(e) => {
                      const updated = [...events];
                      updated[idx].name = e.target.value;
                      setEvents(updated);
                    }}
                    className="bg-[#2A3441] border-gray-700 text-white"
                  />
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <Label className="text-xs">Month</Label>
                      <Input
                        type="number"
                        min="1"
                        value={event.month}
                        onChange={(e) => {
                          const updated = [...events];
                          updated[idx].month = parseInt(e.target.value);
                          setEvents(updated);
                        }}
                        className="bg-[#2A3441] border-gray-700 text-white"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Day</Label>
                      <Input
                        type="number"
                        min="1"
                        value={event.day}
                        onChange={(e) => {
                          const updated = [...events];
                          updated[idx].day = parseInt(e.target.value);
                          setEvents(updated);
                        }}
                        className="bg-[#2A3441] border-gray-700 text-white"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Celestial Trigger</Label>
                      <Select
                        value={event.celestial_trigger || "none"}
                        onValueChange={(value) => {
                          const updated = [...events];
                          updated[idx].celestial_trigger = value === "none" ? "" : value;
                          setEvents(updated);
                        }}
                      >
                        <SelectTrigger className="bg-[#2A3441] border-gray-700 text-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">None</SelectItem>
                          {celestialBodies.map((body, i) => (
                            <SelectItem key={i} value={body.name}>{body.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <Textarea
                    placeholder="Event description..."
                    value={event.description}
                    onChange={(e) => {
                      const updated = [...events];
                      updated[idx].description = e.target.value;
                      setEvents(updated);
                    }}
                    className="bg-[#2A3441] border-gray-700 text-white"
                    rows={2}
                  />
                </div>
                <Button
                  onClick={() => setEvents(events.filter((_, i) => i !== idx))}
                  variant="ghost"
                  size="sm"
                  className="text-red-400 hover:text-red-300"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <Button onClick={handleSave} className="w-full bg-[#37F2D1] hover:bg-[#2dd9bd] text-[#1E2430] text-lg py-6">
        Save Calendar System
      </Button>
    </div>
  );
}