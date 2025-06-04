import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { UserPlus, Search, Edit, Trash2, Eye, EyeOff } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import { deleteUserById, updateUserById } from '@/services/authService'; // Import delete and update services

const CreateUserModal = ({ isOpen, setIsOpen, onUserCreate }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('worker');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const { toast } = useToast();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    if (!name || !email || !password || !role) {
      toast({ variant: "destructive", title: "Error", description: "Please fill all required fields." });
      return;
    }
    if (password.length < 6) {
      toast({ variant: "destructive", title: "Password Too Short", description: "Password must be at least 6 characters long." });
      return;
    }
    try {
      const success = await onUserCreate({ name, email, password, role });
      if (success) {
        setName('');
        setEmail('');
        setPassword('');
        setRole('worker');
        setShowPassword(false);
        setIsOpen(false);
      }
    } catch (err) {
      if (err.message && err.message.includes('already exists')) {
        setErrorMsg('A user with this email already exists.');
      } else {
        setErrorMsg('An error occurred while creating the user.');
      }
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-[525px] bg-card glassmorphism-card">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-tertiary">Create New User</DialogTitle>
          <DialogDescription>Fill in the details below to create a new user account.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="userName" className="text-right text-muted-foreground">Name</Label>
              <Input id="userName" value={name} onChange={(e) => setName(e.target.value)} className="col-span-3 bg-background/70" placeholder="e.g., John Doe" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="userEmail" className="text-right text-muted-foreground">Email</Label>
              <Input id="userEmail" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="col-span-3 bg-background/70" placeholder="e.g., john.doe@example.com" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="userPassword" className="text-right text-muted-foreground">Password</Label>
              <div className="col-span-3 relative">
                <Input 
                  id="userPassword" 
                  type={showPassword ? "text" : "password"} 
                  value={password} 
                  onChange={(e) => setPassword(e.target.value)} 
                  className="bg-background/70 pr-10" 
                  placeholder="Min. 6 characters" 
                />
                <Button 
                  type="button" 
                  variant="ghost" 
                  size="icon" 
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 text-muted-foreground hover:text-primary"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </Button>
              </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="userRole" className="text-right text-muted-foreground">Role</Label>
              <Select value={role} onValueChange={setRole}>
                <SelectTrigger className="col-span-3 bg-background/70">
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="worker">Worker</SelectItem>
                  <SelectItem value="project_manager">Project Manager</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          {errorMsg && (
            <div className="text-red-500 text-sm mb-2 text-center">{errorMsg}</div>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsOpen(false)} className="bg-secondary/50 hover:bg-secondary/80">Cancel</Button>
            <Button type="submit" className="bg-accent hover:bg-accent/90 text-accent-foreground">Create User</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

const EditUserModal = ({ isOpen, setIsOpen, user, onUserUpdate }) => {
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const { toast } = useToast();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name || !email) {
      toast({ variant: "destructive", title: "Error", description: "Please fill all required fields." });
      return;
    }
    try {
      await onUserUpdate(user.id, { name, email });
      setIsOpen(false);
    } catch (error) {
      console.error("Error updating user:", error);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-[525px] bg-card glassmorphism-card">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-tertiary">Edit User</DialogTitle>
          <DialogDescription>Update the user details below.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="editUserName" className="text-right text-muted-foreground">Name</Label>
              <Input id="editUserName" value={name} onChange={(e) => setName(e.target.value)} className="col-span-3 bg-background/70" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="editUserEmail" className="text-right text-muted-foreground">Email</Label>
              <Input id="editUserEmail" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="col-span-3 bg-background/70" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="editUserRole" className="text-right text-muted-foreground">Role</Label>
              <Input id="editUserRole" value={user?.role.replace('_', ' ')} readOnly className="col-span-3 bg-background/70 text-muted-foreground" />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsOpen(false)} className="bg-secondary/50 hover:bg-secondary/80">Cancel</Button>
            <Button type="submit" className="bg-accent hover:bg-accent/90 text-accent-foreground">Update User</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default function UserManagementPage() {
  const { allUsers, addUser, fetchAllUsers } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");

  const handleDeleteUser = async (userId) => {
    if (window.confirm("Are you sure you want to delete this user?")) {
      try {
        await deleteUserById(userId); // Call the delete service
        await fetchAllUsers(); // Refresh the user list
      } catch (error) {
        console.error("Error deleting user:", error);
      }
    }
  };

  const handleEditUser = async (userId, updatedData) => {
    try {
      await updateUserById(userId, updatedData); // Call the update service
      await fetchAllUsers(); // Refresh the user list
      toast({ title: "User Updated", description: "User details have been successfully updated." });
    } catch (error) {
      console.error("Error updating user:", error);
    }
  };

  const handleCreateUser = async (userData) => {
    const success = await addUser(userData);
    if (success) {
      await fetchAllUsers(); // Fuerza refresco inmediato
    }
    return success;
  };

  const filteredUsers = allUsers.filter(user =>
    user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.role.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="container mx-auto py-8 px-4 md:px-6">
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex flex-col sm:flex-row justify-between items-center mb-8 gap-4"
      >
        <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-gray-600">
          User Management
        </h1>
        <Button onClick={() => setIsModalOpen(true)} className="bg-accent hover:bg-accent/90 text-accent-foreground">
          <UserPlus size={18} className="mr-2" /> Add New User
        </Button>
      </motion.div>

      <CreateUserModal isOpen={isModalOpen} setIsOpen={setIsModalOpen} onUserCreate={handleCreateUser} />
      <EditUserModal 
        isOpen={isEditModalOpen} 
        setIsOpen={setIsEditModalOpen} 
        user={selectedUser} 
        onUserUpdate={handleEditUser} 
      />

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2, duration: 0.5 }}
      >
        <Card className="glassmorphism-card mb-8">
          <CardHeader>
            <CardTitle>Filter Users</CardTitle>
            <CardDescription>Search users by name, email, or role.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-grow">
              <Input 
                type="search" 
                placeholder="Search users..." 
                className="pl-10 bg-background/70" 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card className="glassmorphism-card">
          <CardHeader>
            <CardTitle>User List</CardTitle>
            <CardDescription>Total Users: {allUsers.length}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-3 font-semibold text-muted-foreground">Name</th>
                    <th className="text-left p-3 font-semibold text-muted-foreground">Email</th>
                    <th className="text-left p-3 font-semibold text-muted-foreground">Role</th>
                    <th className="text-left p-3 font-semibold text-muted-foreground">Status</th>
                    <th className="text-right p-3 font-semibold text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((user, index) => (
                    <motion.tr 
                      key={user.id} 
                      className="border-b last:border-b-0 hover:bg-secondary/20"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.1 * index + 0.3, duration: 0.3 }}
                    >
                      <td className="p-3">{user.name}</td>
                      <td className="p-3">{user.email}</td>
                      <td className="p-3 capitalize">{user.role.replace('_', ' ')}</td>
                      <td className="p-3">
                        <span className={`px-2 py-1 text-xs rounded-full ${user.status === 'Active' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}`}>
                          {user.status}
                        </span>
                      </td>
                      <td className="p-3 text-right space-x-2">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="hover:bg-primary/10 text-primary" 
                          disabled={user.email === 'admin@example.com'}
                          onClick={() => {
                            setSelectedUser(user);
                            setIsEditModalOpen(true);
                          }}
                        >
                          <Edit size={16} />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="hover:bg-destructive/10 text-destructive" 
                          disabled={user.email === 'admin@example.com'}
                          onClick={() => handleDeleteUser(user.id)}
                        >
                          <Trash2 size={16} />
                        </Button>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
              {/* Mensajes fuera de la tabla */}
              {filteredUsers.length === 0 && searchTerm && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-center py-8"
                >
                  <p className="text-muted-foreground text-lg">No users found matching "{searchTerm}".</p>
                </motion.div>
              )}
              {filteredUsers.length === 0 && !searchTerm && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-center py-12"
                >
                  <UserPlus size={48} className="mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground text-xl">No users created yet (besides the default admin).</p>
                  <p className="text-muted-foreground">Click "Add New User" to get started.</p>
                </motion.div>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
