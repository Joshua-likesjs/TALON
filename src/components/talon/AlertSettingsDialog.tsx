'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';

interface PolygonAlertSettings {
  id: string;
  name: string;
  color: string;
  alertOnExit: boolean;
  alertOnEntry: boolean;
  isActive: boolean;
}

interface AlertSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  firebaseUid: string | undefined;
}

export function AlertSettingsDialog({ open, onOpenChange, firebaseUid }: AlertSettingsDialogProps) {
  const [polygons, setPolygons] = useState<PolygonAlertSettings[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState<string | null>(null);

  // Carregar configurações de alerta
  useEffect(() => {
    if (open && firebaseUid) {
      loadPolygonSettings();
    }
  }, [open, firebaseUid]);

  const loadPolygonSettings = async () => {
    if (!firebaseUid) return;
    
    setLoading(true);
    try {
      const response = await fetch(`/api/polygons/alerts?firebaseUid=${firebaseUid}`);
      const data = await response.json();
      setPolygons(data.polygons || []);
    } catch (error) {
      console.error('Erro ao carregar configurações:', error);
    } finally {
      setLoading(false);
    }
  };

  const updatePolygonSetting = async (
    polygonId: string, 
    field: 'alertOnExit' | 'alertOnEntry' | 'isActive',
    value: boolean
  ) => {
    setSaving(polygonId);
    try {
      await fetch('/api/polygons/alerts', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          polygonId,
          [field]: value,
        }),
      });
      
      // Atualizar localmente
      setPolygons(prev => prev.map(p => 
        p.id === polygonId ? { ...p, [field]: value } : p
      ));
    } catch (error) {
      console.error('Erro ao atualizar configuração:', error);
    } finally {
      setSaving(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            🔔 Configurar Alertas
          </DialogTitle>
          <DialogDescription>
            Configure quando você deseja receber alertas por email para cada área
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : polygons.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>Nenhum polígono configurado</p>
              <p className="text-sm mt-1">Crie áreas no mapa para configurar alertas</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-80 overflow-y-auto">
              {polygons.map((polygon) => (
                <div 
                  key={polygon.id}
                  className="p-3 rounded-lg border border-border bg-card"
                >
                  <div className="flex items-center gap-2 mb-3">
                    <div 
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: polygon.color }}
                    />
                    <span className="font-medium flex-1">{polygon.name}</span>
                    {polygon.isActive ? (
                      <Badge variant="outline" className="text-green-600 border-green-200">
                        Ativo
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-muted-foreground">
                        Pausado
                      </Badge>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">
                        Alertar quando animal <strong>entrar</strong>
                      </span>
                      <Switch
                        checked={polygon.alertOnEntry}
                        onCheckedChange={(checked) => 
                          updatePolygonSetting(polygon.id, 'alertOnEntry', checked)
                        }
                        disabled={saving === polygon.id || !polygon.isActive}
                      />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">
                        Alertar quando animal <strong>sair</strong>
                      </span>
                      <Switch
                        checked={polygon.alertOnExit}
                        onCheckedChange={(checked) => 
                          updatePolygonSetting(polygon.id, 'alertOnExit', checked)
                        }
                        disabled={saving === polygon.id || !polygon.isActive}
                      />
                    </div>
                    
                    <div className="flex items-center justify-between pt-2 border-t border-border">
                      <span className="text-sm text-muted-foreground">
                        Alertas ativos
                      </span>
                      <Switch
                        checked={polygon.isActive}
                        onCheckedChange={(checked) => 
                          updatePolygonSetting(polygon.id, 'isActive', checked)
                        }
                        disabled={saving === polygon.id}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          
          <div className="pt-4 border-t border-border">
            <p className="text-xs text-muted-foreground text-center">
              Os alertas são enviados para o email da sua conta quando um animal 
              entra ou sai das áreas configuradas.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
