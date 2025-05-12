import { supabase } from '@/lib/supabaseClient';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { data, error } = await supabase
      .from('attendance')
      .select('profiles(name), attendance, hoursWorked')
      .eq('status', 'active'); // Adjust filters as needed

    if (error) throw error;

    const formattedData = data.map((row) => ({
      name: row.profiles.name,
      attendance: row.attendance,
      hoursWorked: row.hoursWorked,
    }));

    res.status(200).json(formattedData);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch attendance data' });
  }
}
