import { Button } from '../button';
import { Card, CardHeader, CardTitle, CardContent } from '../card';
import { Dialog, DialogTrigger, DialogContent, DialogTitle, DialogDescription } from '../dialog';
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '../tooltip';
import { Badge } from '../badge';
import { Switch } from '../switch';
import { Label } from '../label';
import { Separator } from '../separator';
import { ScrollArea } from '../scroll-area';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../tabs';

export function PreviewPage() {
  return (
    <div className="p-8 space-y-8">
      <h1 className="text-2xl font-bold">Primitives Preview</h1>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-muted-foreground">Button</h2>
        <div className="flex gap-2">
          <Button variant="primary">Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="destructive">Destructive</Button>
          <Button size="sm">Small</Button>
          <Button size="lg">Large</Button>
        </div>
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-muted-foreground">Card</h2>
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Report Card</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Card content</p>
          </CardContent>
        </Card>
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-muted-foreground">Dialog</h2>
        <Dialog>
          <DialogTrigger asChild>
            <Button>Open Dialog</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogTitle>Title</DialogTitle>
            <DialogDescription>Description text</DialogDescription>
          </DialogContent>
        </Dialog>
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-muted-foreground">Tooltip / Badge / Switch / Tabs</h2>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost">Hover me</Button>
            </TooltipTrigger>
            <TooltipContent>Tooltip content</TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <div className="flex gap-2">
          <Badge>Default</Badge>
          <Badge variant="info">Info</Badge>
          <Badge variant="success">Success</Badge>
          <Badge variant="warning">Warning</Badge>
          <Badge variant="danger">Danger</Badge>
        </div>

        <div className="flex items-center gap-2">
          <Switch id="t" defaultChecked />
          <Label htmlFor="t">Toggle</Label>
        </div>

        <Tabs defaultValue="a">
          <TabsList>
            <TabsTrigger value="a">A</TabsTrigger>
            <TabsTrigger value="b">B</TabsTrigger>
          </TabsList>
          <TabsContent value="a">Content A</TabsContent>
          <TabsContent value="b">Content B</TabsContent>
        </Tabs>
      </section>

      <Separator />

      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-muted-foreground">ScrollArea</h2>
        <ScrollArea className="h-32 w-72 rounded-md border p-4">
          <div className="space-y-2">
            {Array.from({ length: 20 }).map((_, i) => (
              <div key={i} className="text-sm">Item {i + 1}</div>
            ))}
          </div>
        </ScrollArea>
      </section>
    </div>
  );
}
