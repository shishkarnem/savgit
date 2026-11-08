import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, Check, MapPin, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface City {
  id: string;
  name: string;
  avg_salary: number | null;
}

interface CitySearchSelectProps {
  cities: City[];
  value: string;
  onChange: (cityName: string, avgSalary: number | null) => void;
  isLoading?: boolean;
  placeholder?: string;
}

export const CitySearchSelect: React.FC<CitySearchSelectProps> = ({
  cities,
  value,
  onChange,
  isLoading = false,
  placeholder = "Поиск города...",
}) => {
  const [search, setSearch] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Filter cities based on search
  const filteredCities = useMemo(() => {
    if (!search.trim()) return cities;
    const searchLower = search.toLowerCase();
    return cities.filter(city => 
      city.name.toLowerCase().includes(searchLower)
    );
  }, [cities, search]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (city: City) => {
    onChange(city.name, city.avg_salary);
    setSearch('');
    setIsOpen(false);
  };

  const formatSalary = (salary: number | null) => {
    if (!salary) return '';
    return `${(salary / 1000).toFixed(0)}к ₽`;
  };

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder={isLoading ? "Загрузка..." : placeholder}
          value={isOpen ? search : value || ''}
          onChange={(e) => {
            setSearch(e.target.value);
            if (!isOpen) setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          className="pl-10 pr-4 bg-background/50 border-primary/30"
          disabled={isLoading}
        />
        {isLoading && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
        )}
      </div>

      {isOpen && !isLoading && (
        <div className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-lg shadow-lg overflow-hidden">
          <ScrollArea className="max-h-[250px]">
            {filteredCities.length === 0 ? (
              <div className="p-4 text-sm text-muted-foreground text-center">
                Город не найден
              </div>
            ) : (
              <div className="p-1">
                {filteredCities.map((city) => (
                  <button
                    key={city.id}
                    onClick={() => handleSelect(city)}
                    className={cn(
                      "w-full flex items-center justify-between px-3 py-2 text-sm rounded-md transition-colors",
                      "hover:bg-accent hover:text-accent-foreground",
                      value === city.name && "bg-primary/10 text-primary"
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                      <span>{city.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {city.avg_salary && (
                        <span className="text-xs text-muted-foreground">
                          ~{formatSalary(city.avg_salary)}
                        </span>
                      )}
                      {value === city.name && (
                        <Check className="h-4 w-4 text-primary" />
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>
      )}

      {value && !isOpen && (
        <div className="mt-1 text-xs text-muted-foreground">
          {(() => {
            const selectedCity = cities.find(c => c.name === value);
            if (selectedCity?.avg_salary) {
              return `Средняя ЗП: ${selectedCity.avg_salary.toLocaleString('ru-RU')} ₽`;
            }
            return null;
          })()}
        </div>
      )}
    </div>
  );
};

export default CitySearchSelect;