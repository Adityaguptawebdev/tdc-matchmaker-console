import { Card, PageHeader } from '../components/ui/Layout';
import { useAuth } from '../features/auth/AuthContext';
import { CustomerDirectory } from '../features/customers/CustomerDirectory';

export function CustomersPage() {
  const { user } = useAuth();
  return (
    <div>
      <PageHeader
        title="Customers"
        description={
          user?.role === 'lead'
            ? 'All TDC clients across matchmakers.'
            : 'Customers assigned to you. Click a row to open their profile.'
        }
      />
      <Card>
        <CustomerDirectory syncUrl pageSize={10} />
      </Card>
    </div>
  );
}
