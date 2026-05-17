import React, { useState, useMemo } from 'react';
import { Check, ChevronsUpDown, Search, Loader2 } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Button } from './button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from './command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from './popover';

/**
 * SearchableSelect - Combobox avec recherche pour les grandes listes
 * 
 * @param {Array} options - Liste d'options [{value, label, ...extraData}]
 * @param {string} value - Valeur sélectionnée
 * @param {function} onValueChange - Callback quand la valeur change
 * @param {string} placeholder - Placeholder quand rien n'est sélectionné
 * @param {string} searchPlaceholder - Placeholder du champ de recherche
 * @param {string} emptyMessage - Message quand aucun résultat
 * @param {boolean} loading - Affiche un loader
 * @param {boolean} disabled - Désactive le composant
 * @param {string} className - Classes CSS additionnelles
 * @param {function} renderOption - Custom render pour chaque option
 * @param {function} filterOption - Custom filter function
 */
export function SearchableSelect({
  options = [],
  value,
  onValueChange,
  placeholder = "Sélectionner...",
  searchPlaceholder = "Rechercher...",
  emptyMessage = "Aucun résultat trouvé.",
  loading = false,
  disabled = false,
  className,
  renderOption,
  filterOption,
  'data-testid': testId
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  // Find selected option for display
  const selectedOption = useMemo(() => {
    return options.find(opt => opt.value === value);
  }, [options, value]);

  // Filter options based on search
  const filteredOptions = useMemo(() => {
    if (!search) return options;
    
    const searchLower = search.toLowerCase();
    
    if (filterOption) {
      return options.filter(opt => filterOption(opt, searchLower));
    }
    
    return options.filter(opt => 
      opt.label?.toLowerCase().includes(searchLower) ||
      opt.searchTerms?.some(term => term.toLowerCase().includes(searchLower))
    );
  }, [options, search, filterOption]);

  const handleSelect = (selectedValue) => {
    onValueChange(selectedValue === value ? '' : selectedValue);
    setOpen(false);
    setSearch('');
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled || loading}
          className={cn(
            "w-full justify-between font-normal",
            !value && "text-muted-foreground",
            className
          )}
          data-testid={testId}
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Chargement...
            </span>
          ) : selectedOption ? (
            renderOption ? (
              renderOption(selectedOption, true)
            ) : (
              selectedOption.label
            )
          ) : (
            placeholder
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command shouldFilter={false}>
          <div className="flex items-center border-b px-3">
            <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
            <input
              placeholder={searchPlaceholder}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex h-10 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>
          <CommandList>
            <CommandEmpty>{emptyMessage}</CommandEmpty>
            <CommandGroup className="max-h-[300px] overflow-y-auto">
              {filteredOptions.map((option) => (
                <CommandItem
                  key={option.value}
                  value={option.value}
                  onSelect={() => handleSelect(option.value)}
                  className="cursor-pointer"
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === option.value ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {renderOption ? (
                    renderOption(option, false)
                  ) : (
                    <span>{option.label}</span>
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
          {options.length > 50 && (
            <div className="border-t p-2 text-center text-xs text-muted-foreground">
              {filteredOptions.length} sur {options.length} résultats
            </div>
          )}
        </Command>
      </PopoverContent>
    </Popover>
  );
}

/**
 * ClientSelect - Sélecteur de client avec recherche
 */
export function ClientSelect({
  clients = [],
  value,
  onValueChange,
  placeholder = "Sélectionner un client",
  loading = false,
  disabled = false,
  className,
  'data-testid': testId
}) {
  const options = useMemo(() => {
    return clients.map(client => ({
      value: client.id,
      label: `${client.nom}${client.prenom ? ' ' + client.prenom : ''}`,
      searchTerms: [
        client.nom,
        client.prenom,
        client.email,
        client.telephone,
        client.ville
      ].filter(Boolean),
      client
    }));
  }, [clients]);

  const renderClientOption = (option, isSelected) => (
    <div className="flex flex-col">
      <span className={cn("font-medium", isSelected && "text-sm")}>
        {option.label}
      </span>
      {!isSelected && option.client?.email && (
        <span className="text-xs text-muted-foreground">
          {option.client.email}
        </span>
      )}
      {!isSelected && option.client?.telephone && (
        <span className="text-xs text-muted-foreground">
          {option.client.telephone}
        </span>
      )}
    </div>
  );

  return (
    <SearchableSelect
      options={options}
      value={value}
      onValueChange={onValueChange}
      placeholder={placeholder}
      searchPlaceholder="Rechercher par nom, email, téléphone..."
      emptyMessage="Aucun client trouvé."
      loading={loading}
      disabled={disabled}
      className={className}
      renderOption={renderClientOption}
      data-testid={testId}
    />
  );
}

/**
 * TechnicianSelect - Sélecteur de technicien avec recherche
 */
export function TechnicianSelect({
  technicians = [],
  value,
  onValueChange,
  placeholder = "Sélectionner un technicien",
  allowNone = true,
  noneLabel = "Non assigné",
  loading = false,
  disabled = false,
  className,
  'data-testid': testId
}) {
  const options = useMemo(() => {
    const opts = technicians.map(tech => ({
      value: tech.id,
      label: `${tech.nom || tech.prenom || 'Technicien'}${tech.prenom ? ' ' + tech.prenom : ''}`,
      searchTerms: [
        tech.nom,
        tech.prenom,
        tech.email,
        tech.telephone
      ].filter(Boolean),
      technician: tech
    }));
    
    if (allowNone) {
      opts.unshift({
        value: '',
        label: noneLabel,
        searchTerms: ['non', 'assigné', 'aucun']
      });
    }
    
    return opts;
  }, [technicians, allowNone, noneLabel]);

  const renderTechOption = (option, isSelected) => {
    if (!option.technician) {
      return <span className="text-muted-foreground">{option.label}</span>;
    }
    
    return (
      <div className="flex flex-col">
        <span className={cn("font-medium", isSelected && "text-sm")}>
          {option.label}
        </span>
        {!isSelected && option.technician?.email && (
          <span className="text-xs text-muted-foreground">
            {option.technician.email}
          </span>
        )}
      </div>
    );
  };

  return (
    <SearchableSelect
      options={options}
      value={value}
      onValueChange={onValueChange}
      placeholder={placeholder}
      searchPlaceholder="Rechercher un technicien..."
      emptyMessage="Aucun technicien trouvé."
      loading={loading}
      disabled={disabled}
      className={className}
      renderOption={renderTechOption}
      data-testid={testId}
    />
  );
}

/**
 * CategorySelect - Sélecteur de catégorie avec recherche
 */
export function CategorySelect({
  categories = [],
  value,
  onValueChange,
  placeholder = "Sélectionner une catégorie",
  allowNone = true,
  noneLabel = "Aucune catégorie",
  loading = false,
  disabled = false,
  className,
  'data-testid': testId
}) {
  const options = useMemo(() => {
    const opts = categories.map(cat => ({
      value: cat.id,
      label: cat.nom,
      searchTerms: [cat.nom, cat.description].filter(Boolean),
      category: cat
    }));
    
    if (allowNone) {
      opts.unshift({
        value: '',
        label: noneLabel,
        searchTerms: ['aucune', 'catégorie']
      });
    }
    
    return opts;
  }, [categories, allowNone, noneLabel]);

  return (
    <SearchableSelect
      options={options}
      value={value}
      onValueChange={onValueChange}
      placeholder={placeholder}
      searchPlaceholder="Rechercher une catégorie..."
      emptyMessage="Aucune catégorie trouvée."
      loading={loading}
      disabled={disabled}
      className={className}
      data-testid={testId}
    />
  );
}

export default SearchableSelect;
