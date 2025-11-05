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
    AlertDialogTrigger,
  } from '@/components/ui/alert-dialog';

const collectionsToExport = ['accounts', 'categories', 'budgets', 'goals', 'transactions'];

export function ImportExport() {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileToImport, setFileToImport] = useState<File | null>(null);

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
        data[collectionName] = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      }

      const jsonString = JSON.stringify(data, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'fluxopro_backup.json';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

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

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
        setFileToImport(file);
        setIsAlertOpen(true);
    }
  };

  const handleConfirmImport = async () => {
    if (!user || !fileToImport) {
        toast({ variant: 'destructive', title: 'Erro', description: 'Nenhum arquivo selecionado ou usuário não logado.' });
        return;
    }
    setIsImporting(true);

    const reader = new FileReader();
    reader.onload = async (e) => {
        try {
            const data = JSON.parse(e.target?.result as string);
            const batch = writeBatch(firestore);

            for (const collectionName in data) {
                if (collectionsToExport.includes(collectionName)) {
                    const collectionData = data[collectionName] as any[];
                    // First, delete all existing documents in the collection
                    const existingDocsSnap = await getDocs(collection(firestore, `users/${user.uid}/${collectionName}`));
                    existingDocsSnap.forEach(doc => {
                        batch.delete(doc.ref);
                    });

                    // Then, add the new documents
                    for (const docData of collectionData) {
                        const docRef = doc(firestore, `users/${user.uid}/${collectionName}`, docData.id);
                        batch.set(docRef, docData);
                    }
                }
            }

            await batch.commit();
            toast({ title: 'Sucesso!', description: 'Seus dados foram importados com sucesso.' });
        } catch (error) {
            console.error('Import failed:', error);
            toast({ variant: 'destructive', title: 'Erro de Importação', description: 'O arquivo está corrompido ou em formato inválido.' });
        } finally {
            setIsImporting(false);
            setFileToImport(null);
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };
    reader.readAsText(fileToImport);
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
      <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
        <AlertDialogContent>
            <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Importação</AlertDialogTitle>
            <AlertDialogDescription>
                Tem certeza que deseja importar este arquivo? Esta ação substituirá
                TODOS os seus dados atuais (contas, transações, etc.) pelos dados do arquivo.
                Esta ação não pode ser desfeita.
            </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
                if (fileInputRef.current) fileInputRef.current.value = '';
                setFileToImport(null);
            }}>
                Cancelar
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmImport} disabled={isImporting}>
                {isImporting ? 'Importando...' : 'Sim, Importar e Substituir'}
            </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
