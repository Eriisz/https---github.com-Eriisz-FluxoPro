'use client';

import React, { useState, useRef } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useUser, useFirestore } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import {
    collection,
    getDocs,
    writeBatch,
    doc,
  } from 'firebase/firestore';
import { Loader, Download, Upload } from 'lucide-react';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
  } from '@/components/ui/alert-dialog';

import { BACKUP_COLLECTIONS, parseBackup, backupRestorePlan, type Backup } from '@/lib/backup';

const collectionsToExport = BACKUP_COLLECTIONS;
const labels = { accounts: 'Contas', categories: 'Categorias', budgets: 'Orçamentos', goals: 'Metas', transactions: 'Transações' };

function downloadBackup(data: unknown, filename: string) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
  const anchor = document.createElement('a');
  anchor.href = url; anchor.download = filename;
  document.body.appendChild(anchor); anchor.click(); anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function ImportExport() {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [backupToImport, setBackupToImport] = useState<Backup | null>(null);
  const [fileName, setFileName] = useState('');

  const handleExport = async () => {
    if (!user) {
      toast({ variant: 'destructive', title: 'Erro', description: 'Você precisa estar logado.' });
      return;
    }
    setIsExporting(true);
    try {
      const data: { [key: string]: any[] } = {};
      for (const collectionName of collectionsToExport) {
        const querySnapshot = await getDocs(collection(firestore, `users/${user.uid}/${collectionName}`));
        data[collectionName] = querySnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
      }

      downloadBackup(data, 'fluxopro_backup.json');

      toast({ title: 'Sucesso!', description: 'Seus dados foram exportados.' });
    } catch (error) {
      console.error('Export failed:', error);
      toast({ variant: 'destructive', title: 'Erro', description: 'Falha ao exportar dados.' });
    } finally {
      setIsExporting(false);
    }
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    try {
      if (file.size > 10 * 1024 * 1024) throw new Error('O backup deve ter no máximo 10 MB.');
      const backup = parseBackup(JSON.parse(await file.text()));
      setBackupToImport(backup);
      setFileName(file.name);
      setIsAlertOpen(true);
    } catch (error) {
      setBackupToImport(null);
      toast({ variant: 'destructive', title: 'Backup não importado', description: error instanceof Error ? error.message : 'Arquivo inválido.' });
    }
  };

  const handleConfirmImport = async () => {
    if (!user || !backupToImport || isImporting) return;
    setIsImporting(true);
    try {
      const current = {} as Record<(typeof BACKUP_COLLECTIONS)[number], Array<{ id: string }>>;
      for (const name of BACKUP_COLLECTIONS) {
        const snapshot = await getDocs(collection(firestore, `users/${user.uid}/${name}`));
        current[name] = snapshot.docs.map(item => ({ ...item.data(), id: item.id }));
      }
      const plan = backupRestorePlan(current, backupToImport);
      // Download a restore point before changing any stored document.
      downloadBackup(current, `fluxopro_antes_restauracao_${Date.now()}.json`);
      const batch = writeBatch(firestore);
      for (const item of plan) {
        const ref = doc(firestore, `users/${user.uid}/${item.collection}`, item.id);
        if (item.data) batch.set(ref, { ...item.data, userId: user.uid });
        else batch.delete(ref);
      }
      await batch.commit();
      toast({ title: 'Sucesso!', description: 'Backup restaurado. O download de uma cópia dos dados anteriores foi solicitado.' });
      setIsAlertOpen(false);
      setBackupToImport(null);
    } catch (error) {
      toast({ variant: 'destructive', title: 'Restauração não confirmada', description: error instanceof Error ? error.message : 'Não foi possível restaurar. Tente novamente.' });
    } finally {
      setIsImporting(false);
    }
  };


  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Importar/Exportar Dados</CardTitle>
          <CardDescription>
            Faça backup ou restaure seus dados a qualquer momento.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col sm:flex-row gap-4">
          <Button onClick={handleExport} disabled={isExporting}>
            {isExporting ? <Loader className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
            {isExporting ? 'Exportando...' : 'Exportar Dados'}
          </Button>
          <Button onClick={handleImportClick} disabled={isImporting} variant="secondary">
            {isImporting ? <Loader className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
            {isImporting ? 'Importando...' : 'Importar Dados'}
          </Button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            className="hidden"
            accept="application/json"
          />
        </CardContent>
      </Card>
      <AlertDialog open={isAlertOpen} onOpenChange={(open) => { if (!isImporting) setIsAlertOpen(open); }}>
        <AlertDialogContent>
            <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Importação</AlertDialogTitle>
            <AlertDialogDescription>
                Arquivo validado: {fileName}. A restauração substituirá todos os seus dados pelos registros abaixo. Uma cópia dos dados atuais será baixada antes da alteração.
                Evite alterar seus dados em outras abas durante a restauração.
            </AlertDialogDescription>
            </AlertDialogHeader>
            <ul className="space-y-1 text-sm" aria-label="Resumo do backup">
              {BACKUP_COLLECTIONS.map(name => <li key={name}>{labels[name]}: {backupToImport?.[name].length ?? 0}</li>)}
            </ul>
            <AlertDialogFooter>
            <AlertDialogCancel disabled={isImporting} onClick={() => {
                if (fileInputRef.current) fileInputRef.current.value = '';
                setBackupToImport(null);
            }}>
                Cancelar
            </AlertDialogCancel>
            <AlertDialogAction onClick={(event) => { event.preventDefault(); void handleConfirmImport(); }} disabled={isImporting}>
                {isImporting ? 'Importando...' : 'Sim, Importar e Substituir'}
            </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
